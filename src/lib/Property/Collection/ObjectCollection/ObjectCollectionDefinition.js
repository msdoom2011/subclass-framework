/**
 * @class
 * @extends {Subclass.PropertyManager.PropertyTypes.CollectionDefinition}
 */
Subclass.PropertyManager.PropertyTypes.ObjectCollectionDefinition = (function()
{
    /**
     * @param {PropertyType} property
     * @param {Object} propertyDefinition
     * @constructor
     */
    function ObjectCollectionDefinition (property, propertyDefinition)
    {
        ObjectCollectionDefinition.$parent.call(this, property, propertyDefinition);
    }

    ObjectCollectionDefinition.$parent = Subclass.PropertyManager.PropertyTypes.CollectionDefinition;

    /**
     * @inheritDoc
     * @retruns {(string|null)}
     */
    ObjectCollectionDefinition.prototype.validateValue = function(value)
    {
        if (ObjectCollectionDefinition.$parent.prototype.validateValue.call(this, value)) {
            return;
        }
        if (!value || typeof value != 'object' || !Subclass.Tools.isPlainObject(value)) {
            var message = 'The value of the property ' + this.getProperty() + ' must be a plain object or null. ';

            if (typeof value == 'object' && value.$_className) {
                message += 'Instance of class "' + value.$_className + '" was received instead.';

            } else if (typeof value == 'object') {
                message += 'Object with type "' + value.constructor.name + '" was received instead.';

            } else {
                message += 'Value with type "' + (typeof value) + '" was received instead.';
            }
            throw new Error(message);
        }
    };

    /**
     * @inheritDoc
     */
    ObjectCollectionDefinition.prototype.processDefinition = function()
    {
        ObjectCollectionDefinition.$parent.prototype.processDefinition.call(this);

        var defaultValue = this.getValue();

        if (defaultValue !== null) {
            var collection = this.getProperty().getCollection();
            var proto = this.getProto();

            this.getProperty().setIsNull(false);

            for (var propName in defaultValue) {
                if (!defaultValue.hasOwnProperty(propName)) {
                    continue;
                }
                if (!this.isWritable()) {
                    proto.writable = false;
                }
                collection.addItem(
                    propName,
                    defaultValue[propName]
                );
            }
        }
    };

    return ObjectCollectionDefinition;

})();