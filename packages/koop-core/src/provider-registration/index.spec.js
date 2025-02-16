const should = require('should') // eslint-disable-line
const sinon = require('sinon');
const mockProviderPlugin = require('../../test/fixtures/fake-provider');
const mockOutputPlugin = require('../../test/fixtures/output');
const ProviderRegistration = require('./');
const ProviderRoute = require('./provider-route');
const ProviderOutputRoute = require('./provider-output-route');

describe('Tests for Provider', function () {
  it('should create instance of ProviderRegistration', function () {
    const serverSpy = sinon.spy({
      get: () => {},
      post: () => {}
    });
    const koopMock = {
      server: serverSpy,
      outputs: [{ outputClass: mockOutputPlugin }],
      cache: {
        retrieve: () => {},
        upsert: () => {}
      },
      log: {
        debug: () => {},
        info: () => {}
      }
    };
    const providerRegistration = ProviderRegistration.create({ koop: koopMock, provider: { ...mockProviderPlugin, hosts: true } });
    providerRegistration.should.be.instanceOf(ProviderRegistration);
    providerRegistration.should.have.property('options').deepEqual({ hosts: true });
    providerRegistration.should.have.property('namespace', 'test-provider');
    providerRegistration.should.have.property('outputRouteNamespace', 'test-provider');
    providerRegistration.should.have.property('outputs').instanceOf(Array).length(1);
    providerRegistration.should.have.property('routes').instanceOf(Array).length(1);
    providerRegistration.should.have.property('registeredProviderRoutes').length(1);
    providerRegistration.registeredProviderRoutes[0].should.be.instanceOf(ProviderRoute);
    providerRegistration.should.have.property('registeredOutputs').length(1);
    providerRegistration.registeredOutputs[0].should.have.property('namespace', 'MockOutput');
    providerRegistration.registeredOutputs[0].should.have.property('routes').instanceOf(Array).length(1);
    providerRegistration.registeredOutputs[0].routes[0].should.be.instanceOf(ProviderOutputRoute);
    providerRegistration.should.have.property('controller').not.be.undefined();
    providerRegistration.should.have.property('model').not.be.undefined();
    providerRegistration.should.have.property('registerOutputRoutesFirst', false);
    serverSpy.get.should.have.property('calledTwice', true);
    serverSpy.post.should.have.property('calledOnce', true);

    const registrationMetadata = providerRegistration.registrationMetadata();
    registrationMetadata.should.deepEqual({
      version: '0.0.0',
      namespace: 'test-provider',
      providerDefinedRoutes: [
        {
          path: '/fake/:id',
          methods: [
            'get'
          ]
        }
      ],
      registeredOutputs: [
        {
          namespace: 'MockOutput',
          routes: [
            {
              path: '/test-provider/:host/:id/koop-output/:layer',
              methods: [
                'get',
                'post'
              ]
            }
          ]
        }
      ]
    });
  });
});
