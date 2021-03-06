/**
 * @namespace
 */
Subclass.Class = {};

/**
 * @namespace
 */
Subclass.Class.Type = {};

/**
 * @class
 * @description Abstract class of the each class type.
 *      Each instance of current class is a class definition which will be used
 *      for creating instances of its declaration.
 */
Subclass.Class.ClassType = function()
{
    /**
     * @param {Subclass.ClassManager} classManager
     *      Instance of class manager which will hold all class definitions of current module
     *
     * @param {string} className
     *      Name of the creating class
     *
     * @param {Object} classDefinition
     *      Definition of the creating class
     *
     * @constructor
     */
    function ClassType(classManager, className, classDefinition)
    {
        if (!classManager) {
            Subclass.Error.create('InvalidArgument')
                .argument("the class manager instance", false)
                .received(classManager)
                .expected("an instance of Subclass.ClassManager class")
                .apply()
            ;
        }
        if (!className || typeof className != 'string') {
            Subclass.Error.create('InvalidArgument')
                .argument("the name of class", false)
                .received(className)
                .expected("a string")
                .apply()
            ;
        }
        if (!classDefinition && typeof classDefinition != 'object') {
            Subclass.Error.create('InvalidArgument')
                .argument("the definition of class", false)
                .received(classDefinition)
                .expected("a plain object")
                .apply()
            ;
        }

        /**
         * The instance of class manager
         *
         * @type {Subclass.ClassManager}
         * @private
         */
        this._classManager = classManager;

        /**
         * The name of class
         *
         * @type {string}
         * @private
         */
        this._name = className;

        /**
         * The instance class definition
         *
         * @type {(Object|Subclass.Class.ClassDefinition)}
         * @private
         */
        this._definition = classDefinition;

        /**
         * The class constructor function
         *
         * @type {(function|null)}
         * @private
         */
        this._constructor = null;

        /**
         * The instance of class which is parent of current class
         *
         * @type {(Subclass.Class.ClassType|null)}
         * @private
         */
        this._parent = null;

        /**
         * Names of class constants
         *
         * @type {Array}
         * @private
         */
        this._constants = [];

        /**
         * Array with class names of classes which inherit current class
         *
         * @type {Array}
         * @private
         */
        this._children = [];

        /**
         * Reports whether the instance of current class was created
         *
         * @type {boolean}
         * @private
         */
        this._created = false;

        /**
         * List of events
         *
         * @type {Array}
         * @private
         */
        this._events = [];

        /**
         * Initializing operations
         */

        this
            .registerEvent("onInitialize")
            .registerEvent("onCreateClassBefore")
            .registerEvent("onCreateClass")
            .registerEvent("onCreateClassAfter")
            .registerEvent("onCreateInstanceBefore")
            .registerEvent("onCreateInstance")
            .registerEvent("onCreateInstanceAfter")
            .registerEvent("onAddChildClass")
            .registerEvent("onRemoveChildClass")
            .registerEvent("onGetClassChildren")
            .registerEvent("onGetClassParents")
            .registerEvent("onSetParent")
            .registerEvent("onSetConstant")
        ;

        this.initialize();
    }

    /**
     * Can be parent class type
     *
     * @type {(Subclass.Class.ClassType|null)}
     */
    ClassType.$parent = Subclass.Extendable;

    /**
     * List of class mixins
     *
     * @type {Array.<Function>}
     */
    ClassType.$mixins = [Subclass.Event.EventableMixin];

    /**
     * Returns name of class type
     *
     * @example Example:
     *      Subclass.Class.Trait.Trait.getClassTypeName(); // returns "Trait"
     *
     * @returns {string}
     */
    ClassType.getClassTypeName = function ()
    {
        Subclass.Error.create("NotImplementedMethod")
            .method("getClassTypeName")
            .apply()
        ;
    };

    /**
     * Returns class builder constructor for specific class of current class type.
     *
     * @example Example:
     *      Subclass.Class.Type.AbstractClass.AbstractClass.getBuilderClass();
     *      // returns Subclass.Class.Type.AbstractClass.AbstractClassBuilder class constructor
     *
     * @returns {Function}
     */
    ClassType.getBuilderClass = function()
    {
        Subclass.Error.create("NotImplementedMethod")
            .method("getBuilderClass")
            .apply()
        ;
    };

    /**
     * Returns constructor for creating class definition instance
     *
     * @returns {Function}
     *      Returns class type definition constructor function
     */
    ClassType.getDefinitionClass = function()
    {
        return Subclass.Class.ClassDefinition;
    };

    ClassType.prototype = {

        /**
         * Initializes class on creation stage.<br /><br />
         *
         * Current method invokes automatically right at the end of the class type constructor.
         * It can contain different manipulations with class definition or other manipulations that is needed
         */
        initialize: function()
        {
            this.initializeExtensions();
            this.getEvent('onInitialize').trigger();
            this._definition = this.createDefinition(this._definition);

            var classDefinition = this.getDefinition();
                classDefinition.processRelatedClasses();
        },

        /**
         * Returns name of class type
         *
         * @returns {string}
         */
        getType: function()
        {
            return this.constructor.getClassTypeName();
        },

        /**
         * Returns class manager instance
         *
         * @returns {Subclass.ClassManager}
         */
        getClassManager: function ()
        {
            return this._classManager;
        },

        /**
         * Returns name of the current class instance
         *
         * @returns {string}
         */
        getName: function()
        {
            return this._name;
        },

        /**
         * Creates and returns class definition instance.
         *
         * @param {Object} classDefinition
         * @returns {Subclass.Class.ClassDefinition}
         */
        createDefinition: function(classDefinition)
        {
            return Subclass.Tools.createClassInstance(
                this.constructor.getDefinitionClass(),
                this,
                classDefinition
            );
        },

        /**
         * Sets class definition
         *
         * @param {Object} classDefinition
         */
        setDefinition: function(classDefinition)
        {
            var classChildren = this.getClassChildren();
            var classParents = this.getClassParents();
            var classManager = this.getClassManager();

            for (var i = 0; i < classParents.length; i++) {
                var parentClass = classManager.get(classParents[i]);
                    parentClass.removeChildClass(this.getName());
            }
            this.constructor.call(
                this,
                this.getClassManager(),
                this.getName(),
                classDefinition
            );
            this._children = classChildren;
            this.createConstructor();
        },

        /**
         * Returns class definition object
         *
         * @returns {Subclass.Class.ClassDefinition}
         */
        getDefinition: function()
        {
            return this._definition;
        },

        /**
         * Adds name of child class to current class
         *
         * @param {string} className
         *      The name of class
         */
        addChildClass: function(className)
        {
            if (!className || typeof className != 'string') {
                Subclass.Error.create('InvalidArgument')
                    .argument('the name of child class', false)
                    .expected('a string')
                    .received(className)
                    .apply()
                ;
            }
            if (this.hasChild(className)) {
                return;
            }
            this._children.push(className);

            var classManager = this.getClassManager();
            var classInst = classManager.get(className);
            var classInstChildren = classInst.getClassChildren();
            var classParents = this.getClassParents();

            for (var i = 0; i < classParents.length; i++) {
                var parentClassInst = classManager.get(classParents[i]);
                parentClassInst.addChildClass(className);
            }
            for (i = 0; i < classInstChildren.length; i++) {
                if (!this.hasChild(classInstChildren[i])) {
                    this.addChildClass(classInstChildren[i]);
                }
            }
            this
                .getEvent('onAddChildClass')
                .trigger(className)
            ;
        },

        /**
         * Checks whether current class has children with specified class name
         *
         * @param {string} className
         * @returns {boolean}
         */
        hasChild: function(className)
        {
            return this._children.indexOf(className) >= 0;
        },

        /**
         * Removes name of child class from current class
         *
         * @param {string} className
         *      The name of class
         */
        removeChildClass: function(className)
        {
            if (!className || typeof className != 'string') {
                Subclass.Error.create('InvalidArgument')
                    .argument('the name of child class', false)
                    .expected('a string')
                    .received(className)
                    .apply()
                ;
            }
            var classIndex = this._children.indexOf(className);

            if (classIndex >= 0) {
                this._children.splice(classIndex, 1);
            }
            if (this.hasParent()) {
                this.getParent().removeChildClass(className);
            }
            this
                .getEvent('onRemoveChildClass')
                .trigger(className)
            ;
        },

        /**
         * Returns array of children class names which inherits current class
         *
         * @param {boolean} [grouping=false]
         *      Whether the class names should be grouped
         *
         * @return {(string[]|Object)}
         */
        getClassChildren: function(grouping)
        {
            if (grouping !== true) {
                return this._children;
            }
            var classes = {};

            for (var i = 0; i < this._children.length; i++) {
                var childClassName = this._children[i];
                var childClassType = this.getClassManager().get(this._children[i]).getType();

                if (!classes.hasOwnProperty(childClassType)) {
                    classes[childClassType] = [];
                }
                classes[childClassType].push(childClassName);
            }
            this
                .getEvent('onGetClassChildren')
                .trigger(classes)
            ;
            return classes;
        },

        /**
         * Returns chain of parent class names
         *
         * @param {boolean} [grouping=false]
         *      Whether the class names should be grouped
         *
         * @returns {(string[]|Object)}
         */
        getClassParents: function(grouping)
        {
            var classes = [];

            function addClassName(classes, className)
            {
                if (classes.indexOf(className) < 0) {
                    classes.push(className);
                }
            }
            if (grouping !== true) {
                grouping = false;
            }
            if (grouping) {
                classes = {};
            }
            if (arguments[1]) {
                classes = arguments[1];
            }
            if (this.hasParent()) {
                var parent = this.getParent();
                var parentName = parent.getName();

                if (grouping) {
                    var parentType = parent.getType();

                    if (!classes.hasOwnProperty(parentType)) {
                        classes[parentType] = [];
                    }
                    addClassName(classes[parentType], parentName);

                } else {
                    addClassName(classes, parentName);
                }
                classes = parent.getClassParents(grouping, classes);
            }
            this
                .getEvent('onGetClassParents')
                .trigger(classes, grouping)
            ;
            return classes;
        },

        /**
         * Sets class parent
         *
         * @param {string} parentClassName
         */
        setParent: function (parentClassName)
        {
            if (parentClassName == this.getName()) {
                Subclass.Tools.create("Trying to set class as the parent for itself.")
            }
            if (typeof parentClassName == 'string') {
                this._parent = this.getClassManager().get(parentClassName);
                this._parent.addChildClass(this.getName());

            } else if (parentClassName === null) {
                if (this.hasParent()) {
                    this._parent.removeChildClass(this.getName());
                }
                this._parent = null;

            } else {
                Subclass.Error.create('InvalidArgument')
                    .argument("the name of parent class", false)
                    .received(parentClassName)
                    .expected('a name of parent class or null in class "' + this.getName() + '"')
                    .apply()
                ;
            }
            this
                .getEvent('onSetParent')
                .trigger(parentClassName)
            ;
        },

        /**
         * Returns parent class instance
         *
         * @return {(Subclass.Class.ClassType|null)}
         */
        getParent: function ()
        {
            return this._parent;
        },

        /**
         * Checks whether current class extends another one
         *
         * @returns {boolean}
         */
        hasParent: function()
        {
            return !!this._parent;
        },

        /**
         * Sets constants of the class
         *
         * @param {Object} constants
         *      The plain object which keys are names and values are values of constants
         */
        setConstants: function(constants)
        {
            if (!constants || !Subclass.Tools.isPlainObject(constants)) {
                Subclass.Error.create('InvalidArgument')
                    .argument('the constants definition', false)
                    .expected('a plain object')
                    .received(constants)
                    .apply()
                ;
            }
            for (var constantName in constants) {
                if (constants.hasOwnProperty(constantName)) {
                    this.setConstant(constantName, constants[constantName]);
                }
            }
        },

        /**
         * Creates the new (or redefines) constant with specified name and value
         *
         * @throws {Error}
         *      Throws error if specified invalid constant name
         *
         * @param {string} constantName
         *      The name of constant
         *
         * @param {*} constantValue
         *      The value of constant
         */
        setConstant: function(constantName, constantValue)
        {
            if (!constantName || typeof constantName != 'string') {
                Subclass.Error.create('InvalidArgument')
                    .argument('the name of constant', false)
                    .expected('a string')
                    .received(constantName)
                    .apply()
                ;
            }
            this._constants.push(constantName);

            Object.defineProperty(this, constantName, {
                enumerable: true,
                configurable: false,
                writable: false,
                value: constantValue
            });

            this
                .getEvent('onSetConstant')
                .trigger(constantName, constantValue)
            ;
        },

        /**
         * Returns class constants
         *
         * @param {boolean} [withInherited=false]
         *
         * @returns {Object}
         */
        getConstants: function(withInherited)
        {
            var constantNames = this._constants;
            var constants = {};

            for (var i = 0; i < constantNames.length; i++) {
                constants[constantNames[i]] = this[constantNames[i]];
            }
            return constants;
        },

        /**
         * Returns constructor function for current class type
         *
         * @returns {function} Returns named function
         * @throws {Error}
         */
        getConstructorEmpty: function ()
        {
            Subclass.Error.create("NotImplementedMethod")
                .method("getConstructorEmpty")
                .apply()
            ;
        },

        /**
         * Returns class constructor
         *
         * @returns {Function}
         */
        getConstructor: function ()
        {
            if (!this.isConstructorCreated()) {
                this.createConstructor();
            }
            return this._constructor;
        },

        /**
         * Checks whether class constructor is created
         *
         * @returns {boolean}
         */
        isConstructorCreated: function()
        {
            return !!this._constructor;
        },

        /**
         * Generates and returns current class instance constructor
         *
         * @returns {function}
         */
        createConstructor: function ()
        {
            if (this.isConstructorCreated()) {
                return this._constructor;
            }

            // Processing class definition

            var classDefinition = this.getDefinition();
            var baseClassDefinition = classDefinition.getBaseData();
            classDefinition.normalizeData();

            this.getEvent('onCreateClassBefore').trigger(classDefinition);

            classDefinition.setData(Subclass.Tools.extend(
                baseClassDefinition,
                classDefinition.getData()
            ));
            classDefinition.validateData();
            classDefinition.processData();


            // Creating constructor

            var classConstructor = this.getConstructorEmpty();
            var parentClass = this.getParent();

            if (parentClass) {
                var parentClassConstructor = parentClass.getConstructor();
                var classConstructorProto = Object.create(parentClassConstructor.prototype);

                Subclass.Tools.extend(classConstructorProto, classConstructor.prototype);
                classConstructor.prototype = classConstructorProto;
            }

            this.getEvent('onCreateClass').trigger(classConstructor);

            Subclass.Tools.extend(classConstructor.prototype, this.getDefinition().getMethods());
            Subclass.Tools.extend(classConstructor.prototype, this.getDefinition().getMetaData());

            Object.defineProperty(classConstructor.prototype, "constructor", {
                enumerable: false,
                configurable: true,
                value: classConstructor
            });

            classConstructor.prototype.$_className = this.getName();
            classConstructor.prototype.$_classType = this.constructor.getClassTypeName();
            classConstructor.prototype.$_class = this;

            this._constructor = classConstructor;
            this.getEvent('onCreateClassAfter').trigger(classConstructor);

            return classConstructor;
        },

        /**
         * Creates class instance of current class type
         *
         * @returns {object} Class instance
         */
        createInstance: function()
        {
            var args = [];

            for (var i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }

            var classConstructor = this.getConstructor();
            var classInstance = new classConstructor();

            this.getEvent('onCreateInstanceBefore').trigger(classInstance);

            // Adding no methods to class instance

            var classNoMethods = this.getDefinition().getNoMethods(true);

            for (var propName in classNoMethods) {
                if (!classNoMethods.hasOwnProperty(propName)) {
                    continue;
                }
                classInstance[propName] = Subclass.Tools.copy(classNoMethods[propName]);
            }

            this.getEvent('onCreateInstance').trigger(classInstance);

            Object.seal(classInstance);

            if (classInstance.$_constructor) {
                classInstance.$_constructor.apply(classInstance, args);
            }

            // Telling that instance of current class was created

            this.setInstanceCreated();
            this.getEvent('onCreateInstanceAfter').trigger(classInstance);

            return classInstance;
        },

        /**
         * Sets state that the instance of current class was created
         */
        setInstanceCreated: function()
        {
            var classManager = this.getClassManager();
            var classParents = this.getClassParents();

            for (var i = 0; i < classParents.length; i++) {
                classManager.get(classParents[i]).setInstanceCreated();
            }
            this._created = true;
        },

        /**
         * Reports whether the instance of current class was ever created
         *
         * @returns {boolean}
         */
        wasInstanceCreated: function()
        {
            if (this._created) {
                return true;
            }
            if (this.hasParent()) {
                return this.getParent().wasInstanceCreated();
            }
            return false;
        },

        /**
         * Checks if current class is instance of another class
         *
         * @param {string|Subclass.Class.ClassType} className
         * @return {boolean}
         */
        isInstanceOf: function (className)
        {
            if (
                !className
                || (
                    typeof className != 'string'
                    && typeof className != 'object'
                ) || (
                    typeof className == 'object'
                    && !(className instanceof Subclass.Class.ClassType)
                )
            ) {
                Subclass.Error.create('InvalidArgument')
                    .argument("the name of class", false)
                    .received(className)
                    .expected("a string or an instance of Subclass.Class.ClassType")
                    .apply()
                ;
            }
            if (typeof className == 'object') {
                className = className.getName();
            }
            if (this.getName() == className) {
                return true;

            }
            return this.getClassParents().indexOf(className) >= 0;
        }
    };

    return ClassType;

}();