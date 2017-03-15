const events = require('events');
const Config = require('./lib/config');
const Hapi = require('hapi');
const Registry = require('./lib/registry');



class Service extends events.EventEmitter {
    constructor(options = {}) {
        super();

        // set the application base path
        this.basePath = options.basePath || process.cwd();

         // get application name and version
        this.pkg = require(`${this.basePath}/package`);

        // set the server defaults
        this.config = new Config(this.pkg, options, this.basePath);

        if (!this.config.settings.name) {
            throw new Error('Please specify an application name');
        }

        // spin up a new Hapi server
        this.server = new Hapi.Server();
        this.server.decorate('server', 'emitter', this.emit);
        this.server.decorate('server', 'onemit', this.on);
        this.server.connection(this.config.connectionOptions);

        this.registry  = new Registry(this.config, this.pkg);
        this.registry.registerDefaults();

        this._isDebug = this.config.settings.environment === 'production' ||
            this.config.settings.environment === 'prod';
        this.config.settings.maxListeners && this.setMaxListeners(this.config.settings.maxListeners);
    }

    // get App
    static instance(options) {
        if (Service._instance === null || Service._instance === undefined) {
            Service._instance = new Service(options);

            Service._instance.hapi.register(Service._instance.pkgRegistry, (error) => {
                if (error) {
                    console.error(error); process.exit(1);
                }
            });
        }

        return Service._instance;
    }

    set routes(routes) {
        this.server.route(routes);
    }

    logEvent(msg) {
        this.server.emitter('log', msg);
    }

    get cwd() {
        return this.basePath;
    }

    get hapi() {
        return this.server;
    }

    get environment() {
        return this.config.settings.environment;
    }

    get port() {
        return this.config.port;
    }

    get cfg() {
        return this.config;
    }

    get pkgRegistry() {
        return this.registry.bundle;
    }

    // check debug flag
    get isDebug() {
        return !this._isDebug;
    }

    get name() {
        return this.config.settings.name;
    }

    get version() {
        return this.pkg.version;
    }

    get metrics() {
        return this.config.settings.metrics.provider && this.config.settings.metrics.provider.system.counts();
    }

    get maxListeners() {
        return this.getMaxListeners();
    }

}

module.exports = function (options) {
    const service = Service.instance(options);
    return service;
};
