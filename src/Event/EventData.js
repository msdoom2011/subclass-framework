/**
 * @class
 * @constructor
 */
Subclass.Event.EventData = function()
{
    function EventData(eventInst, target)
    {
        /**
         * Event instance
         *
         * @type {Subclass.Event.Event}
         * @private
         */
        this._event = eventInst;

        /**
         * Event executing context
         *
         * @type {*}
         * @private
         */
        this._target = target;

        /**
         * Array of event listeners results
         *
         * @type {Array.<*>}
         * @private
         */
        this._results = [];

        /**
         * Reports whether propagation stopped
         *
         * @type {boolean}
         * @private
         */
        this._stopped = false;

        /**
         * Reports whether invoking default event listener prevented
         *
         * @type {boolean}
         * @private
         */
        this._defaultPrevented = false;
    }

    EventData.prototype = {

        /**
         * Returns the event object instance
         *
         * @returns {Subclass.Event.Event}
         */
        getEvent: function()
        {
            return this._event;
        },

        /**
         * Returns the object for which current event was triggered
         * (matches with "this" variable in event listener callback function)
         *
         * @returns {Object}
         */
        getTarget: function()
        {
            return this._target;
        },

        /**
         * Starts event propagation
         */
        startPropagation: function()
        {
            this._stopped = false;
        },

        /**
         * Stops event propagation
         */
        stopPropagation: function()
        {
            this._stopped = true;
        },

        /**
         * Reports whether event propagation stopped
         *
         * @returns {boolean}
         */
        isPropagationStopped: function()
        {
            return this._stopped;
        },

        /**
         * Prevents call of default event listener
         */
        preventDefault: function()
        {
            this._defaultPrevented = true;
        },

        /**
         * Allows call of default event listener
         */
        allowDefault: function()
        {
            this._defaultPrevented = false;
        },

        /**
         * Reports whether allows call of default event listener
         *
         * @returns {boolean}
         */
        isDefaultPrevented: function()
        {
            return this._defaultPrevented;
        },

        /**
         * Adds new event listener execution result
         *
         * @param {*} result
         *      Event listener execution result
         */
        addResult: function(result)
        {
            this._results.push(result);
        },

        /**
         * Returns all results of event listeners executions
         *
         * @returns {Array.<*>}
         */
        getResults: function()
        {
            return this._results;
        },

        /**
         * Returns first result of event listeners executions
         *
         * @returns {*}
         */
        getFirstResult: function()
        {
            return this._results.length
                ? this._results[0]
                : undefined
            ;
        },

        /**
         * Returns last result of event listeners executions
         *
         * @returns {*}
         */
        getLastResult: function()
        {
            return this._results.length
                ? this._results[this._results.length - 1]
                : undefined
            ;
        },

        /**
         * Clears event listeners execution results
         */
        clearResults: function()
        {
            this._results = [];
        }
    };

    return EventData;
}();