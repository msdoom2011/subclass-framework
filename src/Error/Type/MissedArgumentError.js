/**
 * @final
 * @class
 * @extends {Subclass.Error}
 * @mixes Subclass.Error.Option.Argument
 * @constructor
 * @description
 *
 * The instance of this class helps to build error with message
 * which is actual when some argument was missed.
 *
 * @param {string} [message]
 *      The custom error message
 */
Subclass.Error.MissedArgumentError = (function()
{
    function MissedArgumentError(message)
    {
        MissedArgumentError.$parent.call(this, message);
    }

    MissedArgumentError.$parent = Subclass.Error.ErrorBase;

    MissedArgumentError.$mixins = [
        Subclass.Error.Option.Argument
    ];

    /**
     * Returns the name of error type
     *
     * @method getName
     * @memberOf Subclass.Error.MissedArgumentError
     * @static
     *
     * @returns {string}
     */
    MissedArgumentError.getName = function()
    {
        return "MissedArgument";
    };

    /**
     * Returns required error fields
     *
     * @method getRequiredOptions
     * @memberOf Subclass.Error.InvalidArgumentError
     * @static
     *
     * @returns {Array}
     */
    MissedArgumentError.getRequiredOptions = function()
    {
        var required = MissedArgumentError.$parent.getRequiredOptions();

        return required.concat(['argument']);
    };

    /**
     * @inheritDoc
     */
    MissedArgumentError.prototype.buildMessage = function()
    {
        var message = MissedArgumentError.$parent.prototype.buildMessage.call(this);

        if (!message) {
            message += 'The ' + this.argument() + ' argument is required but was missed.';
        }

        return message;
    };

    Subclass.Error.registerType(
        MissedArgumentError.getName(),
        MissedArgumentError
    );

    return MissedArgumentError;
})();