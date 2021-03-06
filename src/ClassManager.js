/**
 * @class
 * @constructor
 * @description
 *
 * Allows to manipulate by classes: register new, load and get already registered classes.
 *
 * @throws {Error}
 *      Throws error if specified invalid module instance
 *
 * @param {Subclass.Module} module
 *      The module instance
 */
Subclass.ClassManager = (function()
{
    function ClassManager(module)
    {
        if (!module || !(module instanceof Subclass.Module)) {
            Subclass.Error.create('InvalidArgument')
                .argument('the module instance')
                .received(module)
                .expected('an instance of Subclass.Module class')
                .apply()
            ;
        }

        /**
         * Instance of Subclass module
         *
         * @type {Subclass.Module}
         * @private
         */
        this._module = module;

        /**
         * Collection of registered classes
         *
         * @type {Object.<Subclass.Class.ClassType>}
         * @private
         */
        this._classes = {};

        /**
         * The instance of class load manager
         *
         * @type {Subclass.Class.ClassLoader}
         * @private
         */
        this._loader = Subclass.Tools.createClassInstance(Subclass.Class.ClassLoader, this);
    }

    ClassManager.prototype = {

        /**
         * Initializes the class manager
         *
         * @method initialize
         * @memberOf Subclass.ClassManager.prototype
         */
        initialize: function()
        {
            var module = this.getModule();
            var $this = this;

            // Registering basic classes for the root module

            if (module.isRoot()) {
                var defaultClasses = ClassManager.getClasses();

                for (var classTypeName in defaultClasses) {
                    if (!defaultClasses.hasOwnProperty(classTypeName)) {
                        continue;
                    }
                    for (var className in defaultClasses[classTypeName]) {
                        if (
                            !defaultClasses[classTypeName].hasOwnProperty(className)
                            || this.isset(className)
                        ) {
                            continue;
                        }
                        var classDefinition = defaultClasses[classTypeName][className];

                        this.add(
                            classTypeName,
                            className,
                            classDefinition
                        );
                    }
                }
            }

            // Adding event listeners

            var eventManager = module.getEventManager();

            // Checking for classes with the same name in module (and its plug-ins)

            eventManager.getEvent('onLoadingEnd').addListener(function(evt) {
                $this.checkForClones();
                $this.initializeClasses();
            });

            // Checking for classes with the same name in module (and its plug-ins)
            // after the new plug-in module was added

            eventManager.getEvent('onAddPlugin').addListener(function(evt, pluginModule) {
                $this.checkForClones();
                pluginModule.getClassManager().initializeClasses();
            });

            // Start loading classes

            setTimeout(function() {
                if (!module.isRoot()) {
                    return;
                }
                var classesLength = Object.keys($this.getClasses()).length;
                var standardClassesLength = Object.keys(ClassManager.getClasses()).length;

                if (classesLength == standardClassesLength) {
                    module.getLoadManager().startLoading();
                }
            }, 20);
        },

        /**
         * Initializes registered classes
         *
         * @method initializeClasses
         * @memberOf Subclass.ClassManager.prototype
         */
        initializeClasses: function()
        {
            var classes = this.getClasses();

            for (var className in classes) {
                if (classes.hasOwnProperty(className)) {
                    classes[className].createConstructor();
                }
            }
        },

        /**
         * Returns the module instance
         *
         * @method getModule
         * @memberOf Subclass.ClassManager.prototype
         *
         * @returns {Subclass.Module}
         *      The module instance
         */
        getModule: function()
        {
            return this._module;
        },

        /**
         * Returns the instance of class loader
         *
         * @method getLoader
         * @memberOf Subclass.ClassManager.prototype
         *
         * @returns {Subclass.Class.ClassLoader|*}
         */
        getLoader: function()
        {
            return this._loader;
        },

        /**
         * Return all registered classes
         *
         * @method getClasses
         * @memberOf Subclass.ClassManager.prototype
         *
         * @param {boolean} [privateClasses=false]
         *      If it's true it returns classes only from current module
         *      without classes from its plug-ins
         *
         * @param {boolean} [withParentClasses=true]
         *      Should or not will be returned the classes from the parent
         *      modules (it is actual if the current module is a plug-in)
         *
         * @returns {Object.<Subclass.Class.ClassType>}
         */
        getClasses: function(privateClasses, withParentClasses)
        {
            var mainModule = this.getModule();
            var moduleStorage = mainModule.getModuleStorage();
            var classes = {};
            var $this = this;

            if (privateClasses !== true) {
                privateClasses = false;
            }
            if (withParentClasses !== false) {
                withParentClasses = true;
            }

            // Returning classes from current module with classes from its parent modules

            if (!privateClasses && withParentClasses && !mainModule.isRoot() && arguments[2] != mainModule) {
                return mainModule.getRoot().getClassManager().getClasses(false, false, mainModule);

            // Returning classes from current module (without its plug-ins)

            } else if (privateClasses) {
                return this._classes;
            }

            // Adding classes from plug-in modules to result of searching

            moduleStorage.eachModule(function(module) {
                if (module == mainModule) {
                    Subclass.Tools.extend(classes, $this.getClasses(true, false));
                    return;
                }
                var moduleClassManager = module.getClassManager();
                var moduleClasses = moduleClassManager.getClasses(false, false);

                Subclass.Tools.extend(classes, moduleClasses);
            });

            return classes;
        },

        /**
         * Checks whether class manager contains any class
         *
         * @method isEmpty
         * @memberOf Subclass.ClassManager.prototype
         *
         * @returns {boolean}
         */
        isEmpty: function()
        {
            return Subclass.Tools.isEmpty(this._classes);
        },

        /**
         * Returns module names where is defined class with specified name.<br /><br />
         *
         * It is especially actual if class with specified name is defined
         * at once in several modules. So it's convenient to use for searching
         * classes with the same name defined in multiple modules.
         *
         * @method findLocations
         * @memberOf Subclass.ClassManager.prototype
         *
         * @param {string} className
         * @returns {string[]}
         */
        findLocations: function(className)
        {
            var mainModule = this.getModule().getRoot();
            var locations = [];

            if (arguments[1]) {
                mainModule = arguments[1];
            }
            var moduleStorage = this.getModule().getModuleStorage();

            moduleStorage.eachModule(function(module) {
                var classManager = module.getClassManager();

                if (classManager.isset(className, true)) {
                    locations.push(module.getName());
                }
                if (module == mainModule) {
                    return;
                }
                if (module.hasPlugins()) {
                    var pluginModuleStorage = module.getModuleStorage();
                    var plugins = pluginModuleStorage.getPlugins();

                    for (var i = 0; i < plugins.length; i++) {
                        var subPlugin = plugins[i];
                        var subPluginClassManager = subPlugin.getClassManager();
                        var subPluginLocations = subPluginClassManager.findLocations(className, subPlugin);

                        locations = locations.concat(subPluginLocations);
                    }
                }
            });

            return locations;
        },

        /**
         * Validates whether there are classes with the same names in the module and its plug-ins
         *
         * @method checkForClones
         * @memberOf Subclass.ClassManager.prototype
         *
         * @throws {Error}
         *      Throws error if definition multiple definition of class with the same name
         */
        checkForClones: function()
        {
            var mainModule = this.getModule();
            var moduleStorage = mainModule.getModuleStorage();
            var $this = this;
            var classes = {};

            moduleStorage.eachModule(function(module) {
                if (module == mainModule) {
                    Subclass.Tools.extend(classes, $this._classes);
                    return;
                }
                var moduleClassManager = module.getClassManager();
                var moduleClasses = moduleClassManager.getClasses(false, false);

                for (var className in moduleClasses) {
                    if (
                        !moduleClasses.hasOwnProperty(className)
                        || ClassManager.isset(className)
                    ) {
                        continue;
                    }
                    if (classes[className]) {
                        var classLocations = $this.findLocations(className);

                        Subclass.Error.create(
                            'Multiple class definition detected. Class "' + className + '" defined ' +
                            'in modules: "' + classLocations.join('", "') + '".'
                        );
                    }
                    classes[className] = 1;
                }
            });
        },

        /**
         * The same as the {@link Subclass.Class.ClassLoader#loadClass}
         *
         * @method load
         * @memberOf Subclass.ClassManager.prototype
         * @alias Subclass.Class.ClassLoader#loadClass
         */
        load: function()
        {
            var classLoader = this.getLoader();

            classLoader.loadClass.apply(classLoader, arguments);
        },

        /**
         * Creates the instance of class definition
         *
         * @method create
         * @memberOf Subclass.ClassManager.prototype
         *
         * @param {Function} classConstructor
         *      Class constructor of specific class type
         *
         * @param {string} className
         *      A name of the future class
         *
         * @param {Object} classDefinition
         *      A definition of the creating class
         *
         * @returns {Subclass.Class.ClassType}
         */
        create: function(classConstructor, className, classDefinition)
        {
            return Subclass.Tools.createClassInstance(
                classConstructor,
                this,
                className,
                classDefinition
            );
        },

        /**
         * Adds a new class
         *
         * @method add
         * @memberOf Subclass.ClassManager.prototype
         *
         * @throws {Error}
         *      Throws error if:
         *      - The class type name was not specified
         *      - Specified non existent class type name
         *      - Missed or not valid the name class
         *      - Missed or not valid the definition of class
         *      - Trying to redefine already existent class
         *
         * @param {string} classTypeName
         *      The name of class type (i.e. "Class", "AbstractClass", "Interface" etc.)
         *
         * @param {string} className
         *      The name of future class
         *
         * @param {object} classDefinition
         *      The object with definition of the creating class
         *
         * @returns {Subclass.Class.ClassType}
         */
        add: function(classTypeName, className, classDefinition)
        {
            if (!classTypeName) {
                Subclass.Error.create(
                    'Trying to register the class "' + className + '" ' +
                    'without specifying class type.'
                );
            }
            if (!Subclass.ClassManager.issetType(classTypeName)) {
                Subclass.Error.create(
                    'Trying to register the class "' + className + '" ' +
                    'of unknown class type "' + classTypeName + '".'
                );
            }
            if (!className || typeof className != 'string') {
                Subclass.Error.create(
                    'Trying to register the class with wrong name "' + className + '".'
                );
            }
            if (!classDefinition || typeof classDefinition != 'object') {
                Subclass.Error.create(
                    'Trying to register the class "' + className + '" ' +
                    'with empty or not valid class definition.'
                );
            }
            if (this.isset(className)) {
                Subclass.Error.create(
                    'Trying to define class with already ' +
                    'existed class name "' + className + '".'
                );
            }
            var classTypeConstructor = Subclass.ClassManager.getType(classTypeName);
            var classTypeInstance = this.create(classTypeConstructor, className, classDefinition);

            this._classes[className] = classTypeInstance;
            this.getLoader().setClassLoaded(className);

            return classTypeInstance;
        },

        /**
         * Returns the class definition instance
         *
         * @method get
         * @memberOf Subclass.ClassManager.prototype
         *
         * @throws {Error}
         *      Throws error if trying to get non existent class definition instance
         *
         * @param {string} className
         *      The name of needed class
         *
         * @returns {Subclass.Class.ClassType}
         */
        get: function(className)
        {
            if (!this.isset(className)) {
                Subclass.Error.create('Trying to call to none existed class "' + className + '".');
            }
            return this.getClasses()[className];
        },

        /**
         * Checks if class with specified name was ever registered
         *
         * @method isset
         * @memberOf Subclass.ClassManager.prototype
         *
         * @param {string} className
         *      The name of needed class
         *
         * @param {boolean} [privateClasses=false]
         *      If it's true then the checking will be performed only between classes
         *      from current module without classes from its plugins
         *
         * @returns {boolean}
         */
        isset: function(className, privateClasses)
        {
            var withParentClasses = true;

            if (privateClasses === true) {
                withParentClasses = false;
            }
            return !!this.getClasses(privateClasses, withParentClasses)[className];
        },

        /**
         * Builds the new class of specified class type.
         * Creates the class builder instance.
         *
         * @method build
         * @memberOf Subclass.ClassManager.prototype
         *
         * @param {string} classType
         *      The type of class, i.e. 'Class', 'AbstractClass', 'Config', 'Interface', 'Trait'
         *
         * @param {string} [className]
         *      The name of creating class
         *
         * @returns {Subclass.Class.ClassBuilder}
         */
        build: function(classType, className)
        {
            return this.createBuilder(classType, className);
        },

        /**
         * Modifies existed class definition
         *
         * @method alter
         * @memberOf Subclass.ClassManager.prototype
         *
         * @param {string} className
         *      The name of class
         *
         * @returns {Subclass.Class.ClassBuilder}
         */
        alter: function(className)
        {
            return this.createBuilder(null, className);
        },

        /**
         * Registers and returns copy of specified class with specified name
         *
         * @method copy
         * @memberOf Subclass.ClassManager.prototype
         *
         * @param {string} className
         *      The name of source class
         *
         * @param {string} classNameNew
         *      The name of new class
         *
         * @returns {Subclass.Class.ClassType}
         */
        copy: function(className, classNameNew)
        {
            var classInst = this.get(className);
            var classDefinition = classInst.getDefinition().getData();
            var replicaInst = this.add(
                classInst.getType(),
                classNameNew,
                classDefinition
            );
            replicaInst.createConstructor();

            return replicaInst;
        },

        /**
         * Creates the instance of class builder
         *
         * @method createBuilder
         * @memberOf Subclass.ClassManager.prototype
         *
         * @throws {Error}
         *      Throws error if it was specified the name of class
         *      which you want to alter but it doesn't exist
         *
         * @param {string} classType
         *      The name of class type
         *
         * @param {string} [className]
         *      The name class you want to alter.
         *      If it is missing the creating of new class definition will be started.
         */
        createBuilder: function(classType, className)
        {
            var classBuilderConstructor = null;

            if (!classType && className && !this.isset(className)) {
                Subclass.Error.create(
                    'Can\'t alter definition of class "' + className + '". ' +
                    'It does not exists.'
                );
            }
            if (!classType && className) {
                classBuilderConstructor = this.get(className).constructor.getBuilderClass();

            } else {
                classBuilderConstructor = Subclass.ClassManager
                    .getType(classType)
                    .getBuilderClass()
                ;
            }
            return Subclass.Tools.createClassInstance(
                classBuilderConstructor,
                this,
                classType,
                className
            );
        }
    };


    //============================== Class Manager API ================================

    /**
     * Classes that will be added to class manager instance immediately after its creation
     *
     * @type {Object.<Object>}
     * @private
     */
    ClassManager._classes = {};

    /**
     * @type {Object.<function>}
     * @private
     */
    ClassManager._classTypes = {};

    /**
     * Returns all registered default classes
     *
     * @method getClasses
     * @memberOf Subclass.ClassManager
     *
     * @returns {Object.<Object>}
     */
    ClassManager.getClasses = function()
    {
        return this._classes;
    };

    /**
     * Registers the new class.
     * The classes registered by this way will be available in every created module.
     *
     * @method register
     * @memberOf Subclass.ClassManager
     *
     * @throws {Error}
     *      Throws error if trying to redefine already existent class
     *      with the same name in the common scope
     *
     * @param {string} classTypeName
     *      The name of class type
     *
     * @param {string} className
     *      The name of registering class
     *
     * @param {Object} classDefinition
     *      The object with definition of future class
     */
    ClassManager.register = function(classTypeName, className, classDefinition)
    {
        if (this.isset(className)) {
            Subclass.Error.create('The class "' + className + '" is already registered.');
        }
        if (!this._classes[classTypeName]) {
            this._classes[classTypeName] = {};
        }
        this._classes[classTypeName][className] = classDefinition;
    };

    /**
     * Checks whether class with passed name was ever registered.
     * It performs checking only in the common registered classes.
     *
     * @method isset
     * @memberOf Subclass.ClassManager
     *
     * @param {string} className
     *      The name of class
     *
     * @returns {boolean}
     */
    ClassManager.isset = function(className)
    {
        for (var classTypeName in this._classes) {
            if (!this._classes.hasOwnProperty(classTypeName)) {
                continue;
            }
            if (!!this._classes[classTypeName][className]) {
                return true;
            }
        }
        return false;
    };

    /**
     * Registers the new class type
     *
     * @method registerType
     * @memberOf Subclass.ClassManager
     *
     * @param {Function} classTypeConstructor
     *      The constructor of registering class type factory
     */
    ClassManager.registerType = function(classTypeConstructor)
    {
        var classTypeName = classTypeConstructor.getClassTypeName();

        this._classTypes[classTypeName] = classTypeConstructor;

        /**
         * Registering new class type
         *
         * @param {string} className
         * @param {Object} classDefinition
         */
        Subclass.ModuleAPI.prototype["register" + classTypeName] = function (className, classDefinition)
        {
            return this.getModule().getClassManager().add(
                classTypeConstructor.getClassTypeName(),
                className,
                classDefinition
            );
        };
    };

    /**
     * Returns the class type factory constructor
     *
     * @method getType
     * @memberOf Subclass.ClassManager
     *
     * @throws {Error}
     *      Throws error if trying to get constructor
     *      of non existent class type factory
     *
     * @param classTypeName
     *      The name of class type
     *
     * @returns {Function}
     */
    ClassManager.getType = function(classTypeName)
    {
        if (!this.issetType(classTypeName)) {
            Subclass.Error.create('Trying to get non existed class type factory "' + classTypeName + '".');
        }
        return this._classTypes[classTypeName];
    };

    /**
     * Checks if exists specified class type
     *
     * @method issetType
     * @memberOf Subclass.ClassManager
     *
     * @param {string} classTypeName
     *      The name of class type
     *
     * @returns {boolean}
     */
    ClassManager.issetType = function(classTypeName)
    {
        return !!this._classTypes[classTypeName];
    };

    /**
     * Returns names of all registered class types
     *
     * @method getTypes
     * @memberOf Subclass.ClassManager
     *
     * @returns {Object.<Function>}
     */
    ClassManager.getTypes = function()
    {
        return this._classTypes;
    };

    return ClassManager;
})();

