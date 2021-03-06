/**
 * @class
 * @constructor
 * @description
 *
 * The class which allows to load different module files,
 * especially it's actual for loading module classes
 *
 * @throws {Error}
 *      Throws error if specified invalid instance of module
 *
 * @param {Subclass.Module} module
 *      The instnace of module
 */
Subclass.LoadManager = (function()
{
    function LoadManager(module)
    {
        if (!module || !(module instanceof Subclass.Module)) {
            Subclass.Error.create('InvalidError')
                .argument('the module instance', false)
                .received(module)
                .expected('an instance of Subclass.Module class')
                .apply()
            ;
        }

        /**
         * The instance of module
         *
         * @type {Subclass.Module}
         */
        this._module = module;

        /**
         * Stack of files that are loading at the moment
         *
         * @type {Array.<Object>}
         * @private
         */
        this._stack = [];

        /**
         * Portion of files in order to load
         *
         * @type {Array.<string>}
         * @private
         */
        this._stackPortion = [];

        /**
         * Checks whether the loading process continues
         *
         * @type {boolean}
         * @private
         */
        this._loading = false;

        /**
         * Reports that loading was paused
         *
         * @type {boolean}
         * @private
         */
        this._loadingPause = false;

        /**
         * The timeout after which the ready callback will be called
         *
         * @type {(*|null)}
         * @private
         */
        this._loadingEndTimeout = null;

        /**
         * The timeout after which the classes in load stack will start loading
         *
         * @type {(*|null)}
         * @private
         */
        this._addToStackTimeout = null;

        module.getEventManager()
            .registerEvent('onLoadingStart')
            .registerEvent('onLoadingEnd')
            .registerEvent('onAddToLoadStack')
            .registerEvent('onRemoveFromLoadStack')
            .registerEvent('onProcessLoadStack')
        ;
    }

    LoadManager.prototype = {

        /**
         * Initializes instance of load manager
         *
         * @method initialize
         * @memberOf Subclass.LoadManager.prototype
         */
        initialize: function()
        {
            var module = this.getModule();
            var eventManager = module.getEventManager();
            var $this = this;

            // Starting load files of plug-in modules after the files
            // of current module (to which the current one instance of load manager belongs) were fully loaded

            eventManager.getEvent('onLoadingEnd').addListener(-10000000, function(evt) {
                module.getModuleStorage().eachModule(function(module) {
                    if (module != $this.getModule()) {
                        module.getLoadManager().startLoading();
                    }
                });
            });
        },

        /**
         * Returns the instance of module to which current instance of load manager belongs
         *
         * @method getModule
         * @memberOf Subclass.LoadManager.prototype
         *
         * @returns {Subclass.Module}
         */
        getModule: function()
        {
            return this._module;
        },

        /**
         * Starts the process of loading files with new classes
         *
         * @method startLoading
         * @memberOf Subclass.LoadManager.prototype
         */
        startLoading: function()
        {
            var module = this.getModule();
            var $this = this;

            if (
                module.isPlugin()
                && (
                    !module.getParent()
                    || !module.getRoot().isPrepared()
                )
            ) {
                return;
            }
            $this._loading = true;
            $this._loadingPause = false;
            $this.processStack();

            $this.getModule().getEventManager().getEvent('onLoadingStart').trigger();

            if ($this.isStackEmpty()) {
                $this.completeLoading();
            }
        },

        /**
         * Pauses the process of loading files with new classes
         *
         * @method pauseLoading
         * @memberOf Subclass.LoadManager.prototype
         */
        pauseLoading: function()
        {
            clearTimeout(this._loadingEndTimeout);
            this._loadingPause = true;
        },

        /**
         * Reports whether the process of loading files with new classes was paused
         *
         * @method isLoadingPaused
         * @memberOf Subclass.LoadManager.prototype
         *
         * @returns {boolean}
         */
        isLoadingPaused: function()
        {
            return this._loadingPause;
        },

        /**
         * Tries to complete the process of loading files with new classes.
         * If it was completed then will be triggered the appropriate event.
         *
         * @method completeLoading
         * @memberOf Subclass.LoadManager.prototype
         */
        completeLoading: function()
        {
            if (!this.isLoading()) {
                return;
            }
            clearTimeout(this._loadingEndTimeout);
            var $this = this;

            if (
                !this.isLoadingPaused()
                && this.isStackEmpty()
            ) {
                this._loadingEndTimeout = setTimeout(function() {
                    var module = $this.getModule();
                    var eventManager = module.getEventManager();
                    $this._loading = false;

                    eventManager
                        .getEvent('onLoadingEnd')
                        .triggerPrivate()
                    ;
                }, 20);
            }
        },

        /**
         * Checks whether the loading process continues
         *
         * @method isLoading
         * @memberOf Subclass.LoadManager.prototype
         *
         * @returns {boolean}
         */
        isLoading: function()
        {
            return this._loading;
        },

        /**
         * Adds the new file to load stack
         *
         * @method addToStack
         * @memberOf Subclass.LoadManager.prototype
         *
         * @param {string} fileName
         *      The name of file relative to the "rootPath" module settings option.
         *      Also it is possible to specify an absolute path using the "^" symbol at the start of the path.
         *
         * @param {function} [callback]
         *      The callback function which will be invoked after file will be loaded
         */
        addToStack: function(fileName, callback)
        {
            var $this = this;

            if (callback && typeof callback != 'function') {
                Subclass.Error.create('InvalidArgument')
                    .argument('the callback', false)
                    .received(callback)
                    .expected('a function')
                    .apply()
                ;
            }
            if (this.isInStack(fileName)) {
                return;
            }

            this._stack.push({
                file: fileName,
                fileFull: null,
                callback: callback || function() {},
                xmlhttp: null
            });

            clearTimeout(this._addToStackTimeout);
            this.getModule().getEventManager().getEvent('onAddToLoadStack').trigger(
                fileName,
                callback
            );

            this._addToStackTimeout = setTimeout(function() {
                $this.startLoading();
            }, 10);
        },

        /**
         * Alias of {@link Subclass.LoadManager#addToStack}
         *
         * @method load
         * @memberOf Subclass.LoadManager.prototype
         * @alias Subclass.LoadManager#addToStack
         */
        loadFile: function()
        {
            return this.addToStack.apply(this, arguments);
        },

        /**
         * Returns the object of loading file from the load stack
         *
         * @method getStackItem
         * @memberOf Subclass.LoadManager.prototype
         *
         * @param fileName
         *      The name of loading file
         *
         * @returns {*}
         */
        getStackItem: function(fileName)
        {
            var stackItem = null;

            for (var i = 0; i < this._stack.length; i++) {
                if (this._stack[i].file == fileName) {
                    stackItem = this._stack[i];
                }
            }

            return stackItem;
        },

        /**
         * Returns the index of file name in load stack
         *
         * @method getStackItemIndex
         * @memberOf Subclass.LoadManager.prototype
         *
         * @param fileName
         *      The name of file
         *
         * @returns {boolean}
         */
        getStackItemIndex: function(fileName)
        {
            var stackItemIndex = false;

            for (var i = 0; i < this._stack.length; i++) {
                if (this._stack[i].file == fileName) {
                    stackItemIndex = i;
                }
            }

            return stackItemIndex;
        },

        /**
         * Removes specified class from the load stack
         *
         * @method removeFromLoadStack
         * @memberOf Subclass.LoadManager.prototype
         *
         * @param {string} fileName
         *      The name of class
         */
        removeFromStack: function(fileName)
        {
            var mainModule = this.getModule().getRoot();

            if (arguments[1]) {
                mainModule = this.getModule();
            }

            var loadManager = mainModule.getLoadManager();
            var stackItem = loadManager.getStackItem(fileName);
            var stackItemIndex = loadManager.getStackItemIndex(fileName);

            if (stackItem && stackItemIndex !== false) {
                mainModule.getEventManager().getEvent('onRemoveFromLoadStack').trigger(
                    stackItem,
                    stackItemIndex
                );

                if (stackItem.xmlhttp) {
                    stackItem.xmlhttp.abort();
                }
                loadManager._stack.splice(stackItemIndex, 1);
            }

            // Removing from stack from all modules

            var moduleStorage = mainModule.getModuleStorage();

            moduleStorage.eachModule(function (module, moduleName) {
                if (module != mainModule) {
                    module.getLoadManager().removeFromStack(fileName, true);
                }
            });
        },

        /**
         * Processes files from the load stack. Loads files from stack.
         *
         * @method processStack
         * @memberOf Subclass.LoadManager.prototype
         */
        processStack: function()
        {
            var module = this.getModule();
            var moduleSettings = module.getSettingsManager();
            var rootPath = moduleSettings.getRootPath();
            var stackPortion = [];
            var $this = this;

            if (!this.isStackPortionEmpty()) {
                return;
            }

            for (var i = 0; i < this._stack.length; i++) {
                var stackItem = this._stack[i];
                stackPortion.push(stackItem.file);

                if (!stackItem.file.match(/^\^/i)) {
                    stackItem.fileFull = rootPath + stackItem.file;

                } else {
                    stackItem.fileFull = stackItem.file.substr(1);
                }
            }

            // Creating the pack of loading files.
            // While this portion loads the new files will not start loading.

            this.setStackPortion(stackPortion);

            // Triggering the event when processing the new portion of files

            module.getEventManager().getEvent('onProcessLoadStack').trigger(this._stack);

            // Loading files

            !function loadFile(fileName) {
                if (!fileName) {
                    return;
                }
                var stackItem = $this.getStackItem(fileName);

                if (!stackItem) {
                    return;
                }
                stackItem.xmlhttp = Subclass.Tools.loadJS(stackItem.fileFull, function() {
                    $this.removeFromStackPortion(stackItem.file);
                    $this.removeFromStack(stackItem.file);
                    stackItem.callback();

                    var newFileName = $this.getStackPortion()[0];

                    if (newFileName) {
                        loadFile(newFileName);

                    } else {
                        $this.startLoading();
                    }
                });
            }(stackPortion[0]);

            // If loading of files from the portion was not completed
            // then pause the loading of new files while the portion becomes empty

            if (!this.isStackEmpty()) {
                this.pauseLoading();
            }
        },

        /**
         * Checks whether the specified files is in load stack
         *
         * @method isInStack
         * @memberOf Subclass.LoadManager.prototype
         *
         * @param {string} fileName
         *      The name of file
         *
         * @returns {boolean}
         */
        isInStack: function(fileName)
        {
            var mainModule = this.getModule().getRoot();

            if (arguments[1]) {
                mainModule = this.getModule();
            }

            var loadManager = mainModule.getLoadManager();

            for (var i = 0; i < loadManager._stack.length; i++) {
                if (loadManager._stack[i].file == fileName) {
                    return true;
                }
            }

            // Searching file with specified name in all modules

            var moduleStorage = mainModule.getModuleStorage();
            var result = false;

            moduleStorage.eachModule(function (module, moduleName) {
                if (module != mainModule) {
                    result = module.getLoadManager().removeFromStack(fileName, true);

                    if (result) {
                        return false;
                    }
                }
            });

            return result;
        },

        /**
         * Checks whether the load stack is empty
         *
         * @method isStackEmpty
         * @memberOf Subclass.LoadManager.prototype
         *
         * @returns {boolean}
         */
        isStackEmpty: function()
        {
            return !this._stack.length;
        },

        /**
         * Sets the stack portion.<br /><br />
         *
         * It is a pack of file names which will be loaded first.
         * The files, which was added after the portion was created, will be loaded only after
         * the files from current portion will be loaded.
         *
         * @method setStackPortion
         * @memberOf Subclass.LoadManager.prototype
         *
         * @param {Array.<string>} fileNames
         *      The array of file names.
         */
        setStackPortion: function(fileNames)
        {
            if (!Array.isArray(fileNames)) {
                Subclass.Error.create('InvalidArgument')
                    .argument('list of file names', false)
                    .received(fileNames)
                    .expected('array of strings')
                    .apply()
                ;
            }
            this._stackPortion = fileNames;
        },

        /**
         * Returns the stack portion
         *
         * @method getStackPortion
         * @memberOf Subclass.LoadManager.prototype
         *
         * @returns {Array.<string>}
         */
        getStackPortion: function()
        {
            return this._stackPortion;
        },

        /**
         * Reports whether the stack portion is empty
         *
         * @method isStackPortionEmpty
         * @memberOf Subclass.LoadManager.prototype
         *
         * @returns {boolean}
         */
        isStackPortionEmpty: function()
        {
            return !this.getStackPortion().length;
        },

        /**
         * Removes file name from the stack portion
         *
         * @method removeFromStackPortion
         * @memberOf Subclass.LoadManager.prototype
         *
         * @param {string} fileName
         */
        removeFromStackPortion: function(fileName)
        {
            var stackPortion = this.getStackPortion();
            var index = stackPortion.indexOf(fileName);

            if (index >= 0) {
                stackPortion.splice(index, 1);
            }
        }
    };

    return LoadManager;

})();