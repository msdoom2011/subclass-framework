/**
 * @final
 * @class
 * @extends {Subclass.Error}
 * @mixes Subclass.Error.Option.Option
 * @mixes Subclass.Error.Option.Module
 * @mixes Subclass.Error.Option.Expected
 * @mixes Subclass.Error.Option.Received
 * @constructor
 * @description
 *
 * The error class which indicates that was specified not valid value of
 * option in module configuration. To see details about constructor
 * parameters look at {@link Subclass.Error} class constructor
 *
 * @param {string} [message]
 *      The error message
 */
Subclass.Error.InvalidModuleOptionError = (function()
{
    function InvalidModuleOptionError(message)
    {
        InvalidModuleOptionError.$parent.call(this, message);
    }

    InvalidModuleOptionError.$parent = Subclass.Error.ErrorBase;

    InvalidModuleOptionError.$mixins = [
        Subclass.Error.Option.Option,
        Subclass.Error.Option.Module,
        Subclass.Error.Option.Expected,
        Subclass.Error.Option.Received
    ];

    /**
     * Returns the name of error type
     *
     * @method getName
     * @memberOf Subclass.Module.Error.InvalidModuleOptionError
     * @static
     *
     * @returns {string}
     */
    InvalidModuleOptionError.getName = function()
    {
        return "InvalidModuleOption";
    };

    /**
     * Returns required error fields
     *
     * @method getRequiredOptions
     * @memberOf Subclass.Module.Error.InvalidModuleOptionError
     * @static
     *
     * @returns {Array}
     */
    InvalidModuleOptionError.getRequiredOptions = function()
    {
        var required = InvalidModuleOptionError.$parent.getRequiredOptions();

        return required.concat([
            'module',
            'option'
        ]);
    };

    /**
     * @inheritDoc
     */
    InvalidModuleOptionError.prototype.buildMessage = function()
    {
        var message = InvalidModuleOptionError.$parent.prototype.buildMessage.call(this);

        if (!message) {
            message += 'Invalid value of option "' + this.option() + '" ';
            message += 'in settings of module "' + this.module() + '". ';
            message += this.hasExpected() ? ('It must be ' + this.expected() + '. ') : "";
            message += this.hasReceived() ? this.received() : ""
        }

        return message;
    };

    Subclass.Error.registerType(
        InvalidModuleOptionError.getName(),
        InvalidModuleOptionError
    );

    return InvalidModuleOptionError;

})();