/**
 * @namespace
 */
Subclass.Class.Type.AbstractClass = {};

/**
 * @namespace
 */
Subclass.Class.Type.AbstractClass.Extension = {};

/**
 * @class
 * @extends {Subclass.Class.Type.Class.Class}
 */
Subclass.Class.Type.AbstractClass.AbstractClass = (function() {

    /*************************************************/
    /*     Describing class type "AbstractClass"     */
    /*************************************************/

    /**
     * @param {Subclass.ClassManager} classManager
     * @param {string} className
     * @param {Object} classDefinition
     * @extends {Class}
     * @constructor
     */
    function AbstractClass(classManager, className, classDefinition)
    {
        AbstractClass.$parent.call(this, classManager, className, classDefinition);
    }

    /**
     * @type {Subclass.Class.Type.Class.Class}
     */
    AbstractClass.$parent = Subclass.Class.Type.Class.Class;

    /**
     * @inheritDoc
     */
    AbstractClass.getClassTypeName = function ()
    {
        return "AbstractClass";
    };

    /**
     * @inheritDoc
     */
    AbstractClass.getBuilderClass = function()
    {
        return Subclass.Class.Type.AbstractClass.AbstractClassBuilder;
    };

    /**
     * @inheritDoc
     */
    AbstractClass.getDefinitionClass = function()
    {
        return Subclass.Class.Type.AbstractClass.AbstractClassDefinition;
    };

    AbstractClass.prototype = {

        /**
         * @inheritDoc
         */
        setParent: function (parentClassName)
        {
            Subclass.Class.ClassType.prototype.setParent.call(this, parentClassName);

            if (
                this._parent
                && this._parent.constructor != AbstractClass
                && !(this._parent instanceof AbstractClass)
            ) {
                Subclass.Error.create(
                    'The abstract class "' + this.getName() + '" can be ' +
                    'inherited only from the another abstract class.'
                );
            }
        },

        /**
         * @inheritDoc
         */
        getConstructorEmpty: function ()
        {
            return function AbstractClass(){

                // Hook for the grunt-contrib-uglify plugin
                return AbstractClass.name;
            };
        },

        /**
         * @inheritDoc
         * @throws {Error}
         */
        createInstance: undefined
    };



    /*************************************************/
    /*         Registering new class type            */
    /*************************************************/

    Subclass.ClassManager.registerType(AbstractClass);

    return AbstractClass;

})();