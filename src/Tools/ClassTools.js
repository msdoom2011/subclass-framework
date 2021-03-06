Subclass.Tools.CheckTools = (function()
{
    Subclass.Tools.extend(Subclass.Tools, {

        /**
         * Builds the class constructor. It setups the inheritance of class constructor.<br /><br />
         *
         * You can specify two properties directly in constructor function:<br />
         * - $parent - constructor of parent class;<br />
         * - $mixins - array of constructors which method and properties will be added to current constructor.
         *
         * @param {Function} constructor
         *      The class constructor function
         *
         * @returns {Function}
         */
        buildClassConstructor: function(constructor)
        {
            if (constructor.$built) {
                return constructor;
            }
            var constructorProto = constructor.prototype;
            var constructorProtoCopy = {};
            var constructorStatic = {};
            var constructorStaticCopy = {};

            Subclass.Tools.extend(constructorProtoCopy, Subclass.Tools.getObjectProperties(constructorProto));
            Subclass.Tools.extend(constructorStaticCopy, Subclass.Tools.getObjectProperties(constructor));

            function extendStaticProperties(target, source)
            {
                for (var staticPropName in source) {
                    if (
                        source.hasOwnProperty(staticPropName)
                        && ["$parent", "$mixins"].indexOf(staticPropName) < 0
                    ) {
                        target[staticPropName] = source[staticPropName];
                    }
                }
                return target;
            }

            function extendMixinsProto(constructorProto, mixins)
            {
                for (var i = 0; i < mixins.length; i++) {
                    Subclass.Tools.extend(constructorProto, mixins[i].prototype);
                }
            }

            function extendMixinsStatic(constructor, mixins)
            {
                for (var i = 0; i < mixins.length; i++) {
                    Subclass.Tools.extend(constructor, Subclass.Tools.getObjectProperties(mixins[i]));
                }
            }

            if (constructor.$parent) {
                var parentConstructor = this.buildClassConstructor(constructor.$parent);
                constructorProto = Object.create(parentConstructor.prototype);

                extendStaticProperties(constructorStatic, parentConstructor);

                if (constructor.$mixins) {
                    extendMixinsProto(constructorProto, constructor.$mixins);
                    extendMixinsStatic(constructor, constructor.$mixins);
                }
            } else if (constructor.$mixins) {
                extendMixinsProto(constructorProto, constructor.$mixins);
                extendMixinsStatic(constructor, constructor.$mixins);
            }

            constructor.prototype = Subclass.Tools.extend(
                constructorProto,
                constructorProtoCopy
            );
            Subclass.Tools.extend(constructorStatic, constructorStaticCopy);

            extendStaticProperties(
                constructor,
                constructorStatic
            );

            Object.defineProperty(constructor.prototype, "constructor", {
                enumerable: false,
                configurable: true,
                value: constructor
            });

            Object.defineProperty(constructor, "$built", {
                enumerable: false,
                value: true
            });

            // This piece of (shit) code is needed only for Subclass classes

            if (Subclass.Extendable && constructor.prototype instanceof Subclass.Extendable) {
                constructor.$extensions = Subclass.Tools.copy(constructor.$extensions);
            }

            return constructor;
        },

        /**
         * Builds constructor and creates the instance of specified constructor after it was built
         *
         * @param {Function} constructor
         * @param [arguments]
         */
        createClassInstance: function(constructor)
        {
            function getPropertiesFromMixins(constructor)
            {
                var properties = {};

                if (constructor.$parent) {
                    Subclass.Tools.extend(
                        properties,
                        getPropertiesFromMixins(constructor.$parent)
                    );
                }
                if (constructor.$mixins) {
                    for (var i = 0; i < constructor.$mixins.length; i++) {
                        var mixinProperties = constructor.$mixins[i]();
                        Subclass.Tools.extend(properties, mixinProperties);
                    }
                }
                return properties;
            }

            constructor = this.buildClassConstructor(constructor);
            var properties = getPropertiesFromMixins(constructor);
            var instance = new (constructor.bind.apply(constructor, arguments))();

            for (var propName in properties) {
                if (properties.hasOwnProperty(propName) && !instance.hasOwnProperty(propName)) {
                    instance[propName] = properties[propName];
                }
            }

            return instance;
        }
    });

    if (!Function.prototype.bind) {
        Object.defineProperty(Function.prototype, 'bind', {
            enumerable: false,
            configurable: true,
            value: function (oThis)
            {
                if (typeof this !== 'function') {
                    // closest thing possible to the ECMAScript 5
                    // internal IsCallable function
                    throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
                }

                var aArgs = Array.prototype.slice.call(arguments, 1),
                    fToBind = this,
                    fNOP = function() {},
                    fBound = function() {
                        return fToBind.apply(this instanceof fNOP
                                ? this
                                : oThis,
                            aArgs.concat(Array.prototype.slice.call(arguments)));
                    };

                fNOP.prototype = this.prototype;
                fBound.prototype = new fNOP();

                return fBound;
            }
        });
    }

    return Subclass.Tools;

})();