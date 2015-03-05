/**
 * @namespace
 */
Subclass.Class.Type.Trait = {};

/**
 * @class
 * @extends {Subclass.Class.ClassType}
 */
Subclass.Class.Type.Trait.Trait = (function()
{
    /*************************************************/
    /*        Describing class type "Class"          */
    /*************************************************/

    /**
     * @param {Subclass.Class.ClassManager} classManager
     * @param {string} className
     * @param {Object} classDefinition
     * @extends {ClassType}
     * @constructor
     */
    function Trait(classManager, className, classDefinition)
    {
        Trait.$parent.call(this, classManager, className, classDefinition);
    }

    Trait.$parent = Subclass.Class.ClassType;

    /**
     * @inheritDoc
     */
    Trait.getClassTypeName = function ()
    {
        return "Trait";
    };

    /**
     * @inheritDoc
     */
    Trait.getBuilderClass = function()
    {
        return Subclass.Class.Type.Trait.TraitBuilder;
    };

    /**
     * @inheritDoc
     */
    Trait.getDefinitionClass = function()
    {
        return Subclass.Class.Type.Trait.TraitDefinition;
    };

    /**
     * @inheritDoc
     */
    Trait.prototype.setParent = function (parentClassName)
    {
        Trait.$parent.prototype.setParent.call(this, parentClassName);

        if (
            this._parent
            && this._parent.constructor != Trait
            && !(this._parent instanceof Trait)
        ) {
            Subclass.Error.create(
                'The trait "' + this.getName() + '" can be ' +
                'inherited only from the another trait.'
            );
        }
    };
    //
    ///**
    // * @inheritDoc
    // */
    //Trait.prototype.getProperties = function()
    //{
    //    var properties = {};
    //
    //    if (this.hasParent()) {
    //        var parentClass = this.getParent();
    //        var parentProperties = parentClass.getProperties();
    //        properties = Subclass.Tools.extend({}, parentProperties);
    //    }
    //    return Subclass.Tools.extend(
    //        properties,
    //        this._properties
    //    );
    //};
    //
    ///**
    // * @inheritDoc
    // */
    //Trait.prototype.attachProperties = function() {};

    /**
     * @inheritDoc
     */
    Trait.prototype.getConstructorEmpty = function ()
    {
        return function Trait() {

            // Hook for the grunt-contrib-uglify plugin
            return Trait.name;
        };
    };

    /**
     * @inheritDoc
     */
    Trait.prototype.createInstance = undefined;


    /*************************************************/
    /*         Registering new class type            */
    /*************************************************/

    Subclass.Class.ClassManager.registerClassType(Trait);

    return Trait;

})();