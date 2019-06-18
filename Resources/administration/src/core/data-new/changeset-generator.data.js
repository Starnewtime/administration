import types from 'src/core/service/utils/types.utils';

function castValueToNullIfNecessary(value) {
    if (value === '' || typeof value === 'undefined') {
        return null;
    }
    return value;
}

export default class ChangesetGenerator {
    constructor(definitionRegistry) {
        this.definitionRegistry = definitionRegistry;
    }

    /**
     * Creates the change set for the provided entity.
     * @param entity
     * @returns {{changes: *, deletionQueue: Array}}
     */
    generate(entity) {
        const deletionQueue = [];
        const changes = this.recursion(entity, deletionQueue);

        return { changes, deletionQueue };
    }

    /**
     * @private
     * @param {Entity} entity
     * @param deletionQueue
     * @returns {null}
     */
    recursion(entity, deletionQueue) {
        const definition = this.definitionRegistry.get(entity.getEntityName());
        const changes = {};

        const origin = entity.getOrigin();
        const draft = entity.getDraft();

        definition.forEachField((field, fieldName) => {
            // skip read only
            if (field.readOnly) {
                return;
            }

            const draftValue = castValueToNullIfNecessary(draft[fieldName]);
            const originValue = castValueToNullIfNecessary(origin[fieldName]);

            if (definition.isScalarField(field)) {
                if (draftValue !== originValue) {
                    changes[fieldName] = draftValue;
                    return;
                }
            }

            if (definition.isJsonField(field)) {
                const originValueStringified = types.isEmpty(originValue) ? null : JSON.stringify(originValue);
                const draftValueStringified = types.isEmpty(draftValue) ? null : JSON.stringify(draftValue);

                const equals = originValueStringified === draftValueStringified;

                if (!equals && Array.isArray(draftValue) && draftValue.length <= 0) {
                    changes[property] = null;
                    return true;
                }

                if (!equals) {
                    changes[fieldName] = draftValue;
                }

                return;
            }

            if (definition.isToManyAssociation(field)) {
                const associationChanges = this.handleOneToMany(draftValue, originValue, deletionQueue);
                if (associationChanges.length > 0) {
                    changes[fieldName] = associationChanges;
                }

                return;
            }

            // we can skip many to one, the foreign key will be set over the foreignKey field
            if (definition.isToOneAssociation(field)) {
                if (field.relation === 'many_to_one') {
                    return;
                }

                const change = this.recursion(draftValue, deletionQueue);

                if (change !== null) {
                    // if a change is detected, add id as identifier for updates
                    change.id = draftValue.id;
                    changes.push(change);
                }
            }
        });

        if (Object.keys(changes).length > 0) {
            return changes;
        }

        return null;
    }

    /**
     * @private
     * @param draft
     * @param origin
     * @param deletionQueue
     * @returns {Array}
     */
    handleManyToMany(draft, origin, deletionQueue) {
        const changes = [];
        const originIds = Object.keys(origin.items);

        Object.keys(draft.items).forEach((key) => {
            const entity = draft.items[key];

            if (!originIds.includes(entity.id)) {
                changes.push({ id: entity.id });
            }
        });

        originIds.forEach((id) => {
            if (!draft.has(id)) {
                deletionQueue.push({ route: draft.source, key: id });
            }
        });

        return changes;
    }

    /**
     *
     * @param {Object} draft
     * @param {Object} origin
     * @param {Array} deletionQueue
     * @returns {Array}
     */
    handleOneToMany(draft, origin, deletionQueue) {
        const changes = [];
        const originIds = Object.keys(origin.items);

        // check for new and updated items
        Object.keys(draft.items).forEach((key) => {
            const entity = draft.items[key];
            // new record?
            if (!originIds.includes(key)) {
                let change = this.recursion(entity, []);

                if (change === null) {
                    change = { id: entity.id };
                } else {
                    change.id = entity.id;
                }

                changes.push(change);

                return;
            }

            // check if some properties changed
            const change = this.recursion(entity, deletionQueue);
            if (change !== null) {
                // if a change is detected, add id as identifier for updates
                change.id = entity.id;
                changes.push(change);
            }
        });

        originIds.forEach((id) => {
            if (!draft.has(id)) {
                // still existing?
                deletionQueue.push({
                    route: draft.source,
                    key: id
                });
            }
        });

        return changes;
    }
}
