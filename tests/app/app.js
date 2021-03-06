app = Subclass.createModule("app", [
    'appFirstPlugin'
], {
    onSetup: function() {
        configuredModules.push('app');

        // Changing Class/AppClass class definition

        var AppClass = this.getClassManager().get('Class/AppClass');
        var definition = AppClass.getDefinition().getData();

        definition.configuredMethod = function() {
            return true;
        }
    }
});
