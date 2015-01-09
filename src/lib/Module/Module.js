/** @namespace */
Subclass.Module = {};

/**
 * Subclass module constructor
 * @class
 * @property {string} _name Name of the module
 * @constructor
 *
 * @param {string} moduleName
 *      A name of creating module<br />
 *
 * @param {string[]} [moduleDependencies]
 *      Array with names of another modules which are plugins for current one<br />
 *
 * @param {Object} [moduleConfigs]
 * Module configuration object. Allowed configs are:
 * <pre>-----------------------------------------------------------------------------------
 *
 * plugin         {boolean}     optional    Tells that current module is
 *                                          a plugin and its onReady callback
 *                                          will be called only after this
 *                                          module will be included in main
 *                                          module. If "plugin" is true the
 *                                          "autoload" option automatically
 *                                          sets in false and can't be changed.
 *                                          Default false.
 *
 * pluginOf       {string}      optional    Specifies parent module to which
 *                                          current one belongs to. If its sets
 *                                          in true the "plugin" option will
 *                                          atomatically sets in true.
 *
 * autoload       {boolean}     optional    Enables class autoload or not.
 *                                          It's true by default
 *
 * rootPath       {string}      optional    Path to root directory of the
 *                                          project. It's required if autoload
 *                                          parameter value is true.
 *
 * dataTypes      {Object}      optional    Object, which keys will be type
 *                                          names (alias) and value will
 *                                          be its definitions.
 *
 * parameters     {Object}      optional    Object with parameters which can
 *                                          be used in service definitions
 *                                          or in any other places,
 *                                          i.e in classes.
 *
 * services       {Object}      optional    List of service definitions.
 *
 * onReady        {Function}    optional    Callback that will be invoked when
 *                                          all module classes will be loaded.
 * </pre>
 */
Subclass.Module.Module = (function()
{
    /**
     * @ignore
     */
    function Module(moduleName, moduleDependencies, moduleConfigs)
    {
        var $this = this;

        if (!moduleConfigs) {
            moduleConfigs = {};
        }
        if (!moduleDependencies) {
            moduleDependencies = [];
        }

        /**
         * Name of the module
         *
         * @type {string}
         * @private
         */
        this._name = moduleName;

        /**
         * Parent module (if current one is a plugin relative to parent module)
         *
         * @type {(Subclass.Module.Module|null)}
         * @private
         */
        this._parent = null;

        /**
         * Module public api
         *
         * @type {Subclass.Module.ModuleAPI.ModuleAPI}
         * @private
         */
        this._api = new Subclass.Module.ModuleAPI(this);

        /**
         * Event manager instance
         *
         * @type {Subclass.Event.EventManager}
         * @private
         */
        this._eventManager = new Subclass.Event.EventManager(this);

        // Registering events

        this.getEventManager().registerEvent('onReady');

        /**
         * Collection of modules
         *
         * @type {Subclass.Module.ModuleManager}
         * @private
         */
        this._moduleManager = new Subclass.Module.ModuleManager(this, moduleDependencies);

        /**
         * Property manager instance
         *
         * @type {Subclass.Property.PropertyManager}
         * @private
         */
        this._propertyManager = new Subclass.Property.PropertyManager(this);

        /**
         * Class manager instance
         *
         * @type {Subclass.Class.ClassManager}
         * @private
         */
        this._classManager = new Subclass.Class.ClassManager(this);
        this._classManager.initialize();

        /**
         * Service manager instance
         *
         * @type {Subclass.Service.ServiceManager}
         * @private
         */
        this._serviceManager = new Subclass.Service.ServiceManager(this);

        /**
         * Parameter manager instance
         *
         * @type {Subclass.Parameter.ParameterManager}
         * @private
         */
        this._parameterManager = new Subclass.Parameter.ParameterManager(this);

        /**
         * Module configuration
         *
         * @type {Subclass.Module.ModuleConfigs}
         * @private
         */
        this._configManager = new Subclass.Module.ModuleConfigs(this);
        this.setConfigs(moduleConfigs);

        /**
         * Tells that module is ready
         *
         * @type {boolean}
         * @private
         */
        this._ready = false;


        // Adding event listeners

        this.getEventManager().getEvent('onLoadingEnd').addListener(function() {
            $this.triggerOnReady();
        });
    }

    /**
     * Returns module name
     *
     * @returns {string}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.getName = function()
    {
        return this._name;
    };

    /**
     * Sets parent module
     *
     * @param parentModule
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.setParent = function(parentModule)
    {
        if (parentModule !== null && !(parentModule instanceof Subclass.Module.Module)) {
            throw new Error('Invalid parent module. It must be instance of "Subclass.Module.Module".');
        }
        this._parent = parentModule;
    };

    /**
     * Returns parent module
     *
     * @returns {(Subclass.Module.Module|null)}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.getParent = function()
    {
        return this._parent;
    };

    /**
     * Checks whether current module belongs to another module
     *
     * @returns {boolean}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.hasParent = function()
    {
        return !!this._parent;
    };

    /**
     * Returns the root parent module
     *
     * @returns {Subclass.Module.Module}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.getRoot = function()
    {
        var parent = this;

        if (arguments[0] && arguments[0] instanceof Subclass.Module.Module) {
            parent = arguments[0];
        }
        if (parent.hasParent()) {
            parent = parent.getRoot(parent.getParent());
        }
        return parent
    };

    /**
     * Checks whether current module is root module
     *
     * @returns {boolean}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.isRoot = function()
    {
        return !this.hasParent();
    };

    /**
     * Returns public api
     *
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.getAPI = function()
    {
        return this._api;
    };

    /**
     * Sets new module configs.
     * New configs attributes will rewrite specified earlier ones.
     *
     * @param {Object} configs
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.setConfigs = function(configs)
    {
        this.getConfigManager().setConfigs(configs);
    };

    /**
     * Returns module configs
     *
     * @returns {Subclass.Module.ModuleConfigs}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.getConfigManager = function()
    {
        return this._configManager;
    };

    /**
     * Returns event manager instance
     *
     * @returns {Subclass.Event.EventManager}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.getEventManager = function()
    {
        return this._eventManager;
    };

    /**
     * Returns module manager instance
     *
     * @returns {Subclass.Module.ModuleManager}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.getModuleManager = function()
    {
        return this._moduleManager;
    };

    /**
     * Returns class manager instance
     *
     * @returns {Subclass.Class.ClassManager}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.getClassManager = function()
    {
        return this._classManager;
    };

    /**
     * Returns property manager instance
     *
     * @returns {Subclass.Property.PropertyManager}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.getPropertyManager = function()
    {
        return this._propertyManager;
    };

    /**
     * Returns service manager instance
     *
     * @returns {Subclass.Service.ServiceManager}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.getServiceManager = function()
    {
        return this._serviceManager;
    };

    /**
     * Returns parameter manager instance
     *
     * @returns {Subclass.Parameter.ParameterManager}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.getParameterManager = function()
    {
        return this._parameterManager;
    };

    /**
     * Sets callback when all classes was defined and loaded
     *
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.onReady = function(callback)
    {
        this.getConfigManager().setOnReady(callback);
    };

    /**
     * Invokes init callback
     *
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.triggerOnReady = function()
    {
        if (
            this.getConfigManager().isPlugin()
            && (
                !this.hasParent()
                || (
                    this.hasParent()
                    && !this.getRoot().isReady()
                )
            )
        ) {
            return;
        }
        if (this.getClassManager().isLoadStackEmpty()) {
            this.getEventManager().getEvent('onReady').trigger();
            this._ready = true;
        }
    };

    /**
     * Checks if current class manager instance was initialized
     *
     * @returns {boolean}
     * @memberOf Subclass.Module.Module.prototype
     */
    Module.prototype.isReady = function()
    {
        return this._ready;
    };

    return Module;

})();