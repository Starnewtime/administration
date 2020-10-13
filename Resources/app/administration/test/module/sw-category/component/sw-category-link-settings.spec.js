import { createLocalVue, shallowMount } from '@vue/test-utils';
import 'src/module/sw-category/component/sw-category-link-settings';

function createWrapper(privileges = [], category = {}) {
    const localVue = createLocalVue();

    return shallowMount(Shopware.Component.build('sw-category-link-settings'), {
        localVue,
        stubs: {
            'sw-card': true,
            'sw-text-field': true,
            'sw-single-select': true,
            'sw-entity-single-select': true,
            'sw-switch-field': true
        },
        mocks: {
            $route: {
                params: {}
            }
        },
        provide: {
            acl: {
                can: (identifier) => {
                    if (!identifier) {
                        return true;
                    }

                    return privileges.includes(identifier);
                }
            },
            feature: {
                isActive() {
                    return true;
                }
            }
        },
        propsData: {
            category
        }
    });
}

describe('src/module/sw-category/component/sw-category-link-settings', () => {
    it('should be a Vue.js component', async () => {
        const wrapper = createWrapper();

        expect(wrapper.vm).toBeTruthy();
    });

    it('should have an enabled text field for old configuration', async () => {
        const wrapper = createWrapper([
            'category.editor'
        ], {
            linkType: null,
            externalLink: 'https://'
        });

        const linkTypeField = wrapper.find('sw-single-select-stub');
        expect(linkTypeField.attributes().disabled).toBeFalsy();
        expect(linkTypeField.attributes().options).toBeTruthy();
        expect(wrapper.vm.linkTypeValues).toHaveLength(2);

        const textField = wrapper.find('sw-text-field-stub');
        expect(textField.attributes().disabled).toBeFalsy();

        const newTabField = wrapper.find('sw-switch-field-stub');
        expect(newTabField.attributes().disabled).toBeFalsy();
    });

    it('should have an enabled text field for external link', async () => {
        const wrapper = createWrapper([
            'category.editor'
        ], {
            linkType: 'external'
        });

        const linkTypeField = wrapper.find('sw-single-select-stub');
        expect(linkTypeField.attributes().disabled).toBeFalsy();
        expect(linkTypeField.attributes().options).toBeTruthy();
        expect(wrapper.vm.linkTypeValues).toHaveLength(2);

        const textField = wrapper.find('sw-text-field-stub');
        expect(textField.attributes().disabled).toBeFalsy();

        const newTabField = wrapper.find('sw-switch-field-stub');
        expect(newTabField.attributes().disabled).toBeFalsy();
    });

    it('should have enabled select fields for internal link', async () => {
        const wrapper = createWrapper([
            'category.editor'
        ], {
            linkType: 'product'
        });

        const selects = wrapper.findAll('sw-single-select-stub');
        expect(selects).toHaveLength(2);

        const linkTypeField = selects.at(0);
        expect(linkTypeField.attributes().disabled).toBeFalsy();
        expect(linkTypeField.attributes().options).toBeTruthy();
        expect(wrapper.vm.linkTypeValues).toHaveLength(2);

        const internalTypeField = selects.at(1);
        expect(internalTypeField.attributes().disabled).toBeFalsy();
        expect(internalTypeField.attributes().options).toBeTruthy();
        expect(wrapper.vm.entityValues).toHaveLength(3);

        const productSelectField = wrapper.find('sw-entity-single-select-stub');
        expect(productSelectField.attributes().disabled).toBeFalsy();
        expect(productSelectField.attributes().entity).toEqual('product');

        const newTabField = wrapper.find('sw-switch-field-stub');
        expect(newTabField.attributes().disabled).toBeFalsy();
    });

    it('should have correct select fields on entity switch', async () => {
        const wrapper = createWrapper([
            'category.editor'
        ], {
            linkType: 'product',
            internalLink: 'someUuid'
        });

        const productSelectField = wrapper.find('sw-entity-single-select-stub');
        expect(productSelectField.attributes().entity).toEqual('product');
        expect(wrapper.vm.category.internalLink).toBe('someUuid');

        await wrapper.setProps({
            category: {
                linkType: 'category'
            }
        });
        await wrapper.findAll('sw-single-select-stub').at(1).vm.$emit('change');

        const categorySelectField = wrapper.find('sw-entity-single-select-stub');
        expect(categorySelectField.attributes().entity).toEqual('category');
        expect(wrapper.vm.category.internalLink).toBeNull();
    });

    it('should clean up on switch to internal', async () => {
        const wrapper = createWrapper([
            'category.editor'
        ], {
            linkType: 'external',
            externalLink: 'https://'
        });

        await wrapper.setData({
            mainType: 'internal'
        });
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.category.externalLink).toBeNull();
    });

    it('should clean up on switch to external', async () => {
        const wrapper = createWrapper([
            'category.editor'
        ], {
            linkType: 'internal',
            internalLink: 'someUuid'
        });

        await wrapper.setData({
            mainType: 'external'
        });

        expect(wrapper.vm.category.internalLink).toBeNull();
    });

    it('should remain on internal on removal of entity', async () => {
        const wrapper = createWrapper([
            'category.editor'
        ], {
            linkType: 'product',
            internalLink: 'someUuid'
        });

        await wrapper.setData({
            category: {
                linkType: ''
            }
        });
        await wrapper.findAll('sw-single-select-stub').at(1).vm.$emit('change');

        expect(wrapper.vm.category.linkType).toBe('internal');
    });

    it('should have disabled fields with no rights', async () => {
        const wrapper = createWrapper([], {
            linkType: 'external'
        });

        const linkTypeField = wrapper.find('sw-single-select-stub');
        expect(linkTypeField.attributes().disabled).toBeTruthy();

        const externalLinkField = wrapper.find('sw-text-field-stub');
        expect(externalLinkField.attributes().disabled).toBeTruthy();

        const newTabField = wrapper.find('sw-switch-field-stub');
        expect(newTabField.attributes().disabled).toBeTruthy();
    });
});
