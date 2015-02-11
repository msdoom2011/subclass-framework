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
 * @param {Subclass.Module.Module} module
 *      The instnace of module
 */
Subclass.Module.LoadManager = (function()
{
    function LoadManager(module)
    {
        if (!module || !(module instanceof Subclass.Module.Module)) {
            Subclass.Error.create('InvalidError')
                .argument('the module instance', false)
                .received(module)
                .expected('an instance of Subclass.Module.Module class')
                .apply()
            ;
        }

        /**
         * The instance of module
         *
         * @type {Subclass.Module.Module}
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
         * Reports that loading is locked
         *
         * @type {boolean}
         * @private
         */
        this._loadingLocked = true;

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

    /**
     * Initializes instance of load manager
     *
     * @method initialize
     * @memberOf Subclass.Module.LoadManager.prototype
     */
    LoadManager.prototype.initialize = function()
    {
        var module = this.getModule();
        var eventManager = module.getEventManager();
        var $this = this;

        // Unlock loading of module files after the module was created

        eventManager.getEvent('onModuleInit').addListener(function() {
            if (module.isRoot()) {
                $this.unlockLoading();
            }
        });

        // Unlocking loading files of plug-in modules after the files
        // of current module (to which the current one instance of load manager belongs) were fully loaded

        eventManager.getEvent('onLoadingEnd').addListener(100, function() {
            module.getModuleManager().eachModule(function(module) {
                if (module != $this.getModule()) {
                    module.getLoadManager().unlockLoading();
                }
            });
        });
    };

    /**
     * Returns the instance of module to which current instance of load manager belongs
     *
     * @method getModule
     * @memberOf Subclass.Module.LoadManager.prototype
     *
     * @returns {Subclass.Module.Module}
     */
    LoadManager.prototype.getModule = function()
    {
        return this._module;
    };

    /**
     * Locks the process of loading files with new classes
     *
     * @method lockLoading
     * @memberOf Subclass.Class.LoadManager.prototype
     */
    LoadManager.prototype.lockLoading = function()
    {
        this._loadingLocked = true;
    };

    /**
     * Unlocks and starts the process of loading files with new classes
     *
     * @method unlockLoading
     * @memberOf Subclass.Class.LoadManager.prototype
     */
    LoadManager.prototype.unlockLoading = function()
    {
        if (this.getModule().getConfigManager().hasFiles()) {
            return;
        }
        if (!this.isLoadingLocked()) {
            return;
        }
        this._loadingLocked = false;
        this.startLoading();
        this.completeLoading();
    };

    /**
     * Reports whether the process of loading files with new classes is locked
     *
     * @method isLoadingLocked
     * @memberOf Subclass.Class.LoadManager.prototype
     *
     * @returns {boolean}
     */
    LoadManager.prototype.isLoadingLocked = function()
    {
        return this._loadingLocked;
    };

    /**
     * Starts the process of loading files with new classes
     *
     * @method startLoading
     * @memberOf Subclass.Class.LoadManager.prototype
     */
    LoadManager.prototype.startLoading = function()
    {
        var $this = this;

        if (this.isLoadingLocked()) {
            return;
        }

        $this._loading = true;
        $this._loadingPause = false;
        $this.processStack();

        $this.getModule().getEventManager().getEvent('onLoadingStart').trigger();

        if ($this.isStackEmpty()) {
            $this.completeLoading();
        }
    };

    /**
     * Pauses the process of loading files with new classes
     *
     * @method pauseLoading
     * @memberOf Subclass.Class.LoadManager.prototype
     */
    LoadManager.prototype.pauseLoading = function()
    {
        clearTimeout(this._loadingEndTimeout);
        this._loadingPause = true;
    };

    /**
     * Reports whether the process of loading files with new classes was paused
     *
     * @method isLoadingPaused
     * @memberOf Subclass.Class.LoadManager.prototype
     *
     * @returns {boolean}
     */
    LoadManager.prototype.isLoadingPaused = function()
    {
        return this._loadingPause;
    };

    /**
     * Tries to complete the process of loading files with new classes.
     * If it was completed then will be triggered the appropriate event.
     *
     * @method completeLoading
     * @memberOf Subclass.Class.LoadManager.prototype
     */
    LoadManager.prototype.completeLoading = function()
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
                $this.getModule().getEventManager().getEvent('onLoadingEnd').triggerPrivate();
                $this._loading = false;
            }, 10);
        }
    };

    /**
     * Checks whether the loading process continues
     *
     * @method isLoading
     * @memberOf Subclass.Class.LoadManager.prototype
     *
     * @returns {boolean}
     */
    LoadManager.prototype.isLoading = function()
    {
        return this._loading;
    };

    /**
     * Adds the new class to load stack
     *
     * @method addToStack
     * @memberOf Subclass.Class.LoadManager.prototype
     *
     * @param {string} fileName
     *      The name of file relative to the "rootPath" module config option. (^ - for specifying the absolute path)
     *
     * @param {function} [callback]
     *      The callback function which will be invoked after file will be loaded
     */
    LoadManager.prototype.addToStack = function(fileName, callback)
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
            if (!$this.isLoadingLocked()) {
                $this.startLoading();
            }
        }, 10);
    };

    /**
     * Alias of {@link Subclass.Module.LoadManager#addToStack}
     *
     * @type {Function}
     */
    LoadManager.prototype.load = LoadManager.prototype.addToStack;

    LoadManager.prototype.getStackItem = function(fileName)
    {
        var stackItem = null;

        for (var i = 0; i < this._stack.length; i++) {
            if (this._stack[i].file == fileName) {
                stackItem = this._stack[i];
            }
        }

        return stackItem;
    };

    LoadManager.prototype.getStackItemIndex = function(fileName)
    {
        var stackItemIndex = false;

        for (var i = 0; i < this._stack.length; i++) {
            if (this._stack[i].file == fileName) {
                stackItemIndex = i;
            }
        }

        return stackItemIndex;
    };

    /**
     * Removes specified class from the load stack
     *
     * @method removeFromLoadStack
     * @memberOf Subclass.Class.ClassManager.prototype
     *
     * @param {string} fileName
     *      The name of class
     */
    LoadManager.prototype.removeFromStack = function(fileName)
    {
        var stackItem = this.getStackItem(fileName);
        var stackItemIndex = this.getStackItemIndex(fileName);

        if (!stackItem || stackItemIndex === false) {
            return;
        }

        this.getModule().getEventManager().getEvent('onRemoveFromLoadStack').trigger(
            stackItem,
            stackItemIndex
        );

        if (stackItem.xmlhttp) {
            stackItem.xmlhttp.abort();
        }
        this._stack.splice(stackItemIndex, 1);
    };

    /**
     * Processes the classes from load stack
     *
     * @method processStack
     * @memberOf Subclass.Class.LoadManager.prototype
     */
    LoadManager.prototype.processStack = function()
    {
        var moduleConfigs = this.getModule().getConfigManager();
        var rootPath = moduleConfigs.getRootPath();
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

        this.setStackPortion(stackPortion);

        this.getModule().getEventManager().getEvent('onProcessLoadStack').trigger(
            this._stack
        );

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
                    loadFile(newFileName)
                } else {
                    $this.startLoading();
                }
            });
        }(stackPortion[0]);

        if (!this.isStackEmpty()) {
            this.pauseLoading();
        }
    };

    /**
     * Checks whether the specified files is in load stack
     *
     * @method isInStack
     * @memberOf Subclass.Class.LoadManager.prototype
     *
     * @param {string} fileName
     *      The name of file
     *
     * @returns {boolean}
     */
    LoadManager.prototype.isInStack = function(fileName)
    {
        for (var i = 0; i < this._stack.length; i++) {
            if (this._stack[i].file == fileName) {
                return true;
            }
        }
        return false;
    };

    /**
     * Checks whether the load stack is empty
     *
     * @method isStackEmpty
     * @memberOf Subclass.Class.LoadManager.prototype
     *
     * @returns {boolean}
     */
    LoadManager.prototype.isStackEmpty = function()
    {
        return !this._stack.length;
    };

    /**
     * Sets the stack portion
     *
     * @param {Array.<string>} fileNames
     */
    LoadManager.prototype.setStackPortion = function(fileNames)
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
    };

    /**
     * Returns the stack portion
     *
     * @returns {Array.<string>}
     */
    LoadManager.prototype.getStackPortion = function()
    {
        return this._stackPortion;
    };

    /**
     * Reports whether the stack portion is empty
     *
     * @returns {boolean}
     */
    LoadManager.prototype.isStackPortionEmpty = function()
    {
        return !this.getStackPortion().length;
    };

    /**
    * Removes file name from the stack portion
    *
    * @param {string} fileName
    */
    LoadManager.prototype.removeFromStackPortion = function(fileName)
    {
        var stackPortion = this.getStackPortion();
        var index = stackPortion.indexOf(fileName);

        if (index >= 0) {
            stackPortion.splice(index, 1);
        }
    };

    return LoadManager;

})();