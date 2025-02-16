const FeatureServer = require('@koopjs/featureserver');
const koopConfig = require('config');
const Logger = require('@koopjs/logger');
let logger = new Logger();

function Geoservices (model, options) {
  this.model = model;
  if (options.logger) {
    logger = options.logger;
    FeatureServer.setLogger({logger});
  }
}

/**
 * Helper for sending error responses 
 * @param {*} req 
 * @param {*} res 
 */
function sendError(req, res, error) {
  if (!error.error) {
    const err = normalizeError(error);
    if (err.code === 401) FeatureServer.error.authentication(req, res);
    else res.status(err.code || 500).json({ error: err.message });
  // if the error is already in the esri REST API format send back with 200 code, e.g.
  // {
  //   "error" : {
  //     "code": 499,
  //     "message":"Token Required",
  //     "details":[]
  //   }
  // }
  // This is required for ArcGIS Enterprise apps to handle many errors
  } else res.status(200).json(error);
}

/**
 * Helper for pulling data and routing to FeatureServer
 * @param {object} model provider's model
 * @param {object} req request object
 * @param {object} res response object
 */
function pullDataAndRoute (model, req, res) {
  model.pull(req, function (error, data) {
    if (error) sendError(req, res, error);
    else FeatureServer.route(req, res, data);
  });
}

/**
 * Handler for service, layer, and query routes
 * @param {object} req request object
 * @param {object} res response object
 */
Geoservices.prototype.featureServer = function (req, res) {
  // Is model configured for token-authorization?
  if (typeof this.model.authorize === 'function') {
    this.model.authorize(req)
      .then(() => {
        // model will be available when this is instantiated with the Koop controller
        pullDataAndRoute(this.model, req, res);
      })
      .catch(error => {
        const err = normalizeError(error);
        if (err.code === 401) FeatureServer.error.authorization(req, res);
        else res.status(err.code || 500).json({ error: err.message });
      });
  } else {
    pullDataAndRoute(this.model, req, res);
  }
};

/**
 * Handler for the $namepace/rest/info route. Inspects model for authentation info and passes any on to the
 * FeatureServer handler
 * @param {object} req request object
 * @param {object} res response object
 */
Geoservices.prototype.featureServerRestInfo = function (req, res) {
  const authInfo = koopConfig && koopConfig.authInfo || {};
  const authSpec = this.model.authenticationSpecification;
  if (authSpec) {
    authInfo.isTokenBasedSecurity = true;
    // Use https by default, unless KOOP_AUTH_HTTP or authSpec.useHttp are defined and set to true
    const protocol = (authSpec.useHttp === true || process.env.KOOP_AUTH_HTTP === 'true') ? 'http' : 'https';
    authInfo.tokenServicesUrl = `${protocol}://${req.headers.host}${req.baseUrl}/${authSpec.provider}/tokens/`;
  }
  FeatureServer.route(req, res, { authInfo });
};

/**
 * Handler for $namespace/authenticate route. Passes request and response object to the model's "authenticate" function
 * @param {object} req request object
 * @param {object} res response object
 */
Geoservices.prototype.generateToken = function (req, res) {
  // Is model configured for authentication?
  if (typeof this.model.authenticate === 'function') {
    this.model.authenticate(req)
      .then(tokenJson => {
        FeatureServer.authenticate(res, tokenJson);
      })
      .catch(error => {
        const err = normalizeError(error);
        if (err.code === 401) FeatureServer.error.authentication(req, res);
        else res.status(err.code || 500).json({ error: err.message });
      });
  } else {
    res.status(500).json({ error: '"authenticate" not implemented for this provider' });
  }
};

function normalizeError (error) {
  const { code, message, stack } = error;
  let normalizedErrorCode = code;
  if (code === 'COM_0019') {
    normalizedErrorCode = 401;
  } else if (typeof code !== 'number') {
    normalizedErrorCode = 500;
  }

  if (normalizedErrorCode === 500) {
    // Log error then make generic for response
    logger.error('error', error);
    return { message: 'Internal Server Error', code: 500};
  }
  return { message, stack, code: normalizedErrorCode };
}

/**
 * Collection of route objects that define geoservices
 *
 * These routes are bound to the Koop API for each provider. $namespace and 
 * $providerParams will be replaced by a registered providers namespace an
 * configured parameters
 */
Geoservices.routes = [
  {
    path: '$namespace/rest/info',
    methods: ['get', 'post'],
    handler: 'featureServerRestInfo'
  },
  {
    path: '$namespace/tokens/:method',
    methods: ['get', 'post'],
    handler: 'generateToken'
  },
  {
    path: '$namespace/tokens/',
    methods: ['get', 'post'],
    handler: 'generateToken'
  },
  {
    path: '$namespace/rest/services/$providerParams/FeatureServer/:layer/:method',
    methods: ['get', 'post'],
    handler: 'featureServer'
  },
  {
    path: '$namespace/rest/services/$providerParams/FeatureServer/layers',
    methods: ['get', 'post'],
    handler: 'featureServer'
  },
  {
    path: '$namespace/rest/services/$providerParams/FeatureServer/:layer',
    methods: ['get', 'post'],
    handler: 'featureServer'
  },
  {
    path: '$namespace/rest/services/$providerParams/FeatureServer',
    methods: ['get', 'post'],
    handler: 'featureServer'
  },
  {
    path: '$namespace/rest/services/$providerParams/FeatureServer*',
    methods: ['get', 'post'],
    handler: 'featureServer'
  },
  {
    path: '$namespace/rest/services/$providerParams/MapServer*',
    methods: ['get', 'post'],
    handler: 'featureServer'
  }
];

Geoservices.type = 'output';
Geoservices.version = require('../package.json').version;

module.exports = Geoservices;
