Subclass.Extendable = function()
{
    function Extendable()
    {
        // Do nothing
    }

    /**
     * An array of class type extensions
     *
     * @type {Array.<Function>}
     */
    Extendable.$extensions = [];

    /**
     * Registers class extension
     *
     * @param {Function} classExtension
     *      The constructor of class extension
     */
    Extendable.registerExtension = function(classExtension)
    {
        this.$extensions.push(classExtension);
    };

    /**
     * Returns all registered extensions
     *
     * @returns {Array.<Function>}
     */
    Extendable.getExtensions = function()
    {
        return this.$extensions;
    };

    /**
     * Checks whether current extension was specified
     *
     * @param {Function} classExtension
     *      The constructor of class extension
     *
     * @returns {boolean}
     */
    Extendable.hasExtension = function(classExtension)
    {
        return this.$extensions.indexOf(classExtension) >= 0
    };

    /**
     * Clears all registered extensions
     */
    Extendable.clearExtensions = function()
    {
        this.$extensions = [];
    };

    /**
     * Initializes extensions
     */
    Extendable.prototype.initializeExtensions = function()
    {
        var extensions = this.constructor.getExtensions();

        for (var i = 0; i < extensions.length; i++) {
            extensions[i] = Subclass.Tools.buildClassConstructor(extensions[i]);
            extensions[i].initialize(this);
        }
    };

    return Extendable;
}();