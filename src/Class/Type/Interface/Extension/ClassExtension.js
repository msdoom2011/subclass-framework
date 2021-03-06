/**
 * @class
 * @constructor
 */
Subclass.Class.Type.Interface.Extension.ClassExtension = function() {

    function ClassExtension(classInst)
    {
        ClassExtension.$parent.apply(this, arguments);
    }

    ClassExtension.$parent = Subclass.Class.ClassExtension;

    ClassExtension.$config = {
        classes: ["Class"]
    };

    ClassExtension.initialize = function(classInst)
    {
        var performClasses = this.getConfig().classes;

        if (performClasses.indexOf(classInst.getType()) < 0) {
            return false;
        }
        ClassExtension.$parent.initialize.apply(this, arguments);

        // Defining interfaces storage

        classInst.getEvent('onInitialize').addListener(function(evt)
        {
            /**
             * List of interfaces class names
             *
             * @type {Array<Subclass.Class.Type.Interface.Interface>}
             * @private
             */
            this._interfaces = [];
        });

        // Added ability to return interfaces in class parents list

        classInst.getEvent('onGetClassParents').addListener(function(evt, classes, grouping)
        {
            var interfaces = this.getInterfaces(true);

            function addClassName(classes, className)
            {
                if (classes.indexOf(className) < 0) {
                    classes.push(className);
                }
            }
            for (var i = 0; i < interfaces.length; i++) {
                var classInst = interfaces[i];
                var className = classInst.getName();

                if (grouping) {
                    var classType = classInst.getType();

                    if (!classes.hasOwnProperty(classType)) {
                        classes[classType] = [];
                    }
                    addClassName(classes[classType], className);

                } else {
                    addClassName(classes, className);
                }
            }
        });
    };


    //=========================================================================
    //========================== ADDING NEW METHODS ===========================
    //=========================================================================

    var Class = Subclass.Class.Type.Class.Class;

    Subclass.Tools.extend(Class.prototype, {

        /**
         * Adds interfaces
         *
         * @param {Object} interfaces
         */
        addInterfaces: function(interfaces)
        {
            if (!interfaces || !Array.isArray(interfaces)) {
                Subclass.Error.create('InvalidArgument')
                    .argument('the traits list', false)
                    .expected('an array')
                    .received(interfaces)
                    .apply()
                ;
            }
            for (var i = 0; i < interfaces.length; i++) {
                this.addInterface(interfaces[i]);
            }
        },

        /**
         * Adds new interface
         *
         * @param {string} interfaceName
         * @throws {Error}
         */
        addInterface: function (interfaceName)
        {
            if (!interfaceName || typeof interfaceName != 'string') {
                Subclass.Error.create('InvalidArgument')
                    .argument("the name of interface", false)
                    .received(interfaceName)
                    .expected("a string")
                    .apply()
                ;
            }
            var interfaceClass = this.getClassManager().get(interfaceName);
            interfaceClass.addChildClass(this.getName());

            if (interfaceClass.constructor != Subclass.Class.Type.Interface.Interface) {
                Subclass.Error.create(
                    'Can\'t implement no interface "' + interfaceName + '" ' +
                    'in class "' + this.getName() + '".'
                );
            }

            var interfaceClassConstructor = interfaceClass.getConstructor();
            var interfaceClassConstructorProto = interfaceClassConstructor.prototype;
            var abstractMethods = {};

            if (interfaceClass.constructor != Subclass.Class.Type.Interface.Interface) {
                Subclass.Error.create(
                    'Trying add to "$_implements" option ' +
                    'the new class "' + interfaceName + '" that is not an interface.'
                );
            }

            // Add all interface prototype properties (with inherited)

            loop: for (var methodName in interfaceClassConstructorProto) {
                if (typeof interfaceClassConstructorProto[methodName] != 'function') {
                    continue;
                }
                abstractMethods[methodName] = interfaceClassConstructorProto[methodName];
            }
            this.addAbstractMethods(abstractMethods);
            this.getInterfaces().push(interfaceClass);
        },

        /**
         * Returns interface names list
         *
         * @throws {Error}
         *
         * @param {boolean} [withInherited=false]
         *      Whether the inherited interfaces should be returned
         *
         * @returns {Array<Subclass.Class.Interface.Interface>}
         */
        getInterfaces: function(withInherited)
        {
            if (withInherited !== true) {
                return this._interfaces;
            }
            var classManager = this.getClassManager();
            var interfaces = Subclass.Tools.copy(this._interfaces);

            for (var i = 0; i < interfaces.length; i++) {
                var interfaceParents = interfaces[i].getClassParents();

                for (var j = 0; j < interfaceParents.length; j++) {
                    interfaces.push(classManager.get(interfaceParents[j]));
                }
            }
            if (this.hasParent()) {
                var parent = this.getParent();

                if (parent.getInterfaces) {
                    interfaces = interfaces.concat(parent.getInterfaces(withInherited))
                }
            }
            return interfaces;
        },

        /**
         * Checks if current class implements specified interface
         *
         * @param interfaceName
         * @returns {*}
         * @throws {Error}
         */
        isImplements: function (interfaceName)
        {
            if (!interfaceName || typeof interfaceName != 'string') {
                Subclass.Error.create('InvalidArgument')
                    .argument("the name of interface", false)
                    .received(interfaceName)
                    .expected("a string")
                    .apply()
                ;
            }
            var interfaces = this.getInterfaces();

            for (var i = 0; i < interfaces.length; i++) {
                if (interfaces[i].isInstanceOf(interfaceName)) {
                    return true;
                }
            }
            if (this.hasParent()) {
                var parent = this.getParent();

                if (parent.isImplements) {
                    return parent.isImplements(interfaceName);
                }
            }
            return false;
        }
    });


    //=========================================================================
    //======================== REGISTERING EXTENSION ==========================
    //=========================================================================

    Subclass.Module.onInitializeBefore(function(evt, module)
    {
        Class = Subclass.Tools.buildClassConstructor(Class);

        if (!Class.hasExtension(ClassExtension)) {
            Class.registerExtension(ClassExtension);
        }
    });

    return ClassExtension;
}();