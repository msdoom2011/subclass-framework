Subclass.Tools = {
    /**
     * Extends target object or array with source object or array without recursion.
     *
     * Every property in the source object or array will replace
     * already existed property with the same name in the target object or array.
     *
     * @param {(Object|Array)} target
     *      An object which will receive properties from source object
     *
     * @param {(Object|Array)} source
     *      An object which properties will be transferred to the target object
     *
     * @param {boolean} [withInheritedProps = false]
     *      A marker which indicates whether will be transferred
     *      inherited (from prototype) properties from source to target object
     *
     * @returns {(Object|Array)}
     */
    extend: function (target, source, withInheritedProps)
    {
        if (withInheritedProps !== true) {
            withInheritedProps = false;
        }
        if (typeof target != 'object' && source != 'object') {
            return target;
        }
        if (
            (!Array.isArray(target) && Array.isArray(source))
            || (Array.isArray(target) && !Array.isArray(source))
        ) {
            return target;
        }
        if (Array.isArray(target)) {
            for (var i = 0; i < source.length; i++) {
                target.push(source[i]);
            }
        } else {
            for (var propName in source) {
                if (!source.hasOwnProperty(propName) && !withInheritedProps) {
                    continue;
                }
                target[propName] = source[propName];
            }
        }
        return target;
    },

    /**
     * Copies all properties from source to target with recursion call.
     *
     * Every property in the source object or array will replace
     * already existed property with the same name in the target object or array.
     *
     * @param {(Object|Array)} target
     *
     *      Target object which will extended by properties from source object
     *
     * @param {(Object|Array)} source
     *
     *      Source object which properties will added to target object
     *
     * @param {(Function|boolean)} [mergeArrays=false]
     *
     *      If was passed true it means that elements from source array properties
     *      will be added to according array properties in target.
     *
     *      Else if it was passed false (by default) it means that array properties from source object will
     *      replace array properties in target object.
     *
     *      If was passed a function it means that will added all element from array property in source to
     *      according array property in target if specified function returns true.
     *
     *      Example: function (targetArrayPropertyElement, sourceArrayPropertyElement) {
     *          return targetArrayPropertyElement.name != sourceArrayPropertyElement.name;
     *      });
     *
     * @param {boolean} [withInheritedProps=false]
     *
     *      Default false. Specified if there is a need to copy inherited properties.
     *
     * @returns {*}
     */
    extendDeep: function extendDeep (target, source, mergeArrays, withInheritedProps)
    {
        if (withInheritedProps !== true) {
            withInheritedProps = false;
        }
        if (
            !mergeArrays
            || (
                typeof mergeArrays != "boolean"
                && typeof mergeArrays != "function"
            )
        ) {
            mergeArrays = false;
        }

        var comparator = false;

        if (typeof mergeArrays == 'function') {
            comparator = mergeArrays;
            mergeArrays = true;
        }

        // Handle case when target is a string or something

        if (typeof target != "object" && typeof target != 'function') {
            target = {};
        }

        function isEqual(target, element)
        {
            for (var i = 0; i < target.length; i++) {
                if (comparator(target[i], element)) {
                    return true;
                }
            }
            return false;
        }

        function isPlainObject(obj)
        {
            if (
                typeof obj != "object"
                || obj === null
                || obj.nodeType
                || obj == window
            ) {
                return false;
            }
            return !(
                obj.constructor
                && !obj.constructor.prototype.hasOwnProperty("isPrototypeOf")
            );
        }

        // Extend the base object

        for (var propName in source) {
            var sourceItemIsArray;

            if (!withInheritedProps && !source.hasOwnProperty(propName)) {
                continue;
            }

            // Prevent never-ending loop

            if (target === source[propName]) {
                continue;
            }

            // Recourse if we're merging plain objects or arrays

            if (
                source[propName]
                && (
                    isPlainObject(source[propName])
                    || (
                        mergeArrays
                        && (sourceItemIsArray = Array.isArray(source[propName]))
                    )
                )
            ) {
                var clone;

                // If copying array

                if (sourceItemIsArray && mergeArrays) {
                    sourceItemIsArray = false;
                    clone = [];

                    if (target[propName] && Array.isArray(target[propName])) {
                        for (var k = 0; k < source[propName].length; k++) {
                            if (
                                !comparator
                                || (
                                    typeof comparator == 'function'
                                    && !isEqual(target[propName], source[propName][k])
                                )
                            ) {
                                target[propName].push(source[propName][k]);
                            }
                        }
                        continue;
                    }

                // If copying non array

                } else {
                    clone = target[propName] && isPlainObject(target[propName])
                        ? target[propName]
                        : {}
                    ;
                }

                // Never move original objects, clone them

                target[propName] = extendDeep.call(
                    this,
                    clone,
                    source[propName],
                    comparator || mergeArrays,
                    withInheritedProps
                );

                // Don't bring in undefined values

            } else if (source[propName] !== undefined) {
                target[propName] = source[propName];
            }
        }

        // Return the modified object

        return target;
    },

    /**
     * Returns a copy of passed object or array
     *
     * @param {(Object|Array)} object
     * @returns {*}
     */
    copy: function (object)
    {
        var newObj;

        if (
            typeof object == 'object'
            && (
                object.constructor == Object
                || Array.isArray(object)
            )
        ) {
            newObj = Object.create(Object.getPrototypeOf(object));
            newObj = this.extendDeep(newObj, object, true);

        } else {
            newObj = object;
        }
        return newObj;
    },

    /**
     * Checks whether two arguments are equivalent
     *
     * @param {*} arg1
     * @param {*} arg2
     * @returns {boolean}
     */
    isEqual: function(arg1, arg2)
    {
        if (typeof arg1 !== 'object' && typeof arg2 !== 'object') {
            return arg1 === arg2;
        }
        if (typeof arg1 !== typeof arg2) {
            return false;
        }
        if ((!arg1 && arg2) || (arg1 && !arg2)) {
            return false;
        }
        if (!arg1 && !arg2) {
            return true;
        }
        if (arg1.constructor != arg2.constructor) {
            return false;
        }
        if (Array.isArray(arg1)) {
            if (arg1.length != arg2.length) {
                return false;
            }
            for (var i = 0; i < arg1.length; i++) {
                if (this.isEqual(arg1[i], arg2[i]) === false) {
                    return false;
                }
            }
        }
        if (Array.isPlainObject(arg1)) {
            if (Object.keys(arg1).length != Object.keys(arg2).length) {
                return false;
            }
            for (var propName in arg1) {
                if (this.isEqual(arg1[propName], arg2[propName]) === false) {
                    return false;
                }
            }
        }
        return arg1 == arg2;
    },

    /**
     * Returns array with unique elements
     *
     * @param {Array} array
     * @returns {Array}
     */
    unique: function(array)
    {
        var uniqueArray = [];

        if (!Array.isArray(array)) {
            return array;
        }
        for (var i = 0; i < array.length; i++) {
            if (uniqueArray.indexOf(array[i]) < 0) {
                uniqueArray.push(array[i]);
            }
        }
        return uniqueArray;
    }
};