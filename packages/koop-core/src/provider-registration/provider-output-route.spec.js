const should = require('should') // eslint-disable-line
const sinon = require('sinon');
const mockProviderPlugin = require('../../test/fixtures/fake-provider');
const mockOutputPlugin = require('../../test/fixtures/output');
const ProviderOutputRoute = require('./provider-output-route');
const ProviderRegistration = require('./');

describe('Tests for ProviderOutputRoute', function () {
  it('should create instance of ProviderOutputRoute', function () {
    const serverSpy = sinon.spy({
      get: () => {},
      post: () => {}
    });
    const provider = new ProviderRegistration({
      provider: mockProviderPlugin,
      koop: {
        outputs: [{ outputClass: mockOutputPlugin }],
        cache: {
          retrieve: () => {},
          upsert: () => {}
        }
      }
    });
    const providerOutputRoute = ProviderOutputRoute.create({
      ...provider,
      ...provider.outputs[0].routes[0],
      controller: provider.outputs[0],
      server: serverSpy
    });
    providerOutputRoute.should.be.instanceOf(ProviderOutputRoute);
    providerOutputRoute.should.have.property('controller');
    providerOutputRoute.should.have.property('handler', 'pullData');
    providerOutputRoute.should.have.property('path', '/koop-output/:layer');
    providerOutputRoute.should.have.property('registeredPath', '/test-provider/:id/koop-output/:layer');
    providerOutputRoute.should.have.property('methods', ['get', 'post']);
    serverSpy.get.calledOnceWith(providerOutputRoute.registeredPath, providerOutputRoute.routeHandler);
    serverSpy.post.calledOnceWith(providerOutputRoute.registeredPath, providerOutputRoute.routeHandler);
  });
});
