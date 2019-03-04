import util from 'src/core/service/util.service';
import template from './sw-tabs.html.twig';
import './sw-tabs.scss';

/**
 * @public
 * @description Renders tabs. Each item references a route or emits a custom event.
 * @status ready
 * @example-type static
 * @component-example
 * <sw-tabs>
 *
 *     <sw-tabs-item :route="{ name: 'sw.explore.index' }">
 *         Explore
 *     </sw-tabs-item>
 *
 *     <sw-tabs-item href="https://www.shopware.com">
 *         My Plugins
 *     </sw-tabs-item>
 *
 * </sw-tabs>
 */
export default {
    name: 'sw-tabs',
    template,

    props: {
        isVertical: {
            type: Boolean,
            required: false,
            default: false
        },

        small: {
            type: Boolean,
            required: false,
            default: true
        },

        alignRight: {
            type: Boolean,
            required: false,
            default: false
        },

        defaultItem: {
            type: String,
            required: false,
            default: ''
        }
    },

    data() {
        return {
            active: this.defaultItem || '',
            isScrollable: false,
            activeItem: null,
            scrollLeftPossible: false,
            scrollRightPossible: true,
            firstScroll: false
        };
    },

    created() {
        this.updateActiveItem();
    },

    mounted() {
        const tabContent = this.$refs.swTabContent;

        tabContent.addEventListener('scroll', util.throttle(() => {
            const rightEnd = tabContent.scrollWidth - tabContent.offsetWidth;
            const leftDistance = tabContent.scrollLeft;

            this.scrollRightPossible = !(rightEnd - leftDistance < 5);
            this.scrollLeftPossible = !(leftDistance < 5);
        }, 100));

        this.checkIfNeedScroll();
        window.addEventListener('resize', util.throttle(() => this.checkIfNeedScroll(), 1000));
    },

    watch: {
        '$route'() {
            this.updateActiveItem();
        }
    },

    computed: {
        tabClasses() {
            return {
                'sw-tabs--vertical': this.isVertical,
                'sw-tabs--small': this.small,
                'sw-tabs--scrollable': this.isScrollable,
                'sw-tabs--align-right': this.alignRight
            };
        },

        arrowClassesLeft() {
            return {
                'sw-tabs__arrow--disabled': !this.scrollLeftPossible
            };
        },

        arrowClassesRight() {
            return {
                'sw-tabs__arrow--disabled': !this.scrollRightPossible
            };
        },

        sliderLength() {
            if (this.$children[this.activeItem]) {
                const activeChildren = this.$children[this.activeItem];
                return this.isVertical ? activeChildren.$el.offsetHeight : activeChildren.$el.offsetWidth;
            }
            return 0;
        },

        sliderMovement() {
            if (this.$children[this.activeItem]) {
                const activeChildren = this.$children[this.activeItem];
                return this.isVertical ? activeChildren.$el.offsetTop : activeChildren.$el.offsetLeft;
            }
            return 0;
        },

        sliderStyle() {
            if (this.isVertical) {
                return `
                    transform: translate(0, ${this.sliderMovement}px) rotate(${this.alignRight ? '-90deg' : '90deg'});
                    width: ${this.sliderLength}px;
                `;
            }


            return `
                transform: translate(${this.sliderMovement}px, 0) rotate(0deg);
                width: ${this.sliderLength}px;
                `;
        }
    },

    methods: {
        updateActiveItem() {
            this.$nextTick().then(() => {
                this.$children.forEach((item, i) => {
                    const firstChild = item.$children[0] || item;
                    const linkIsActive = firstChild ? firstChild.$el.classList.contains('sw-tabs-item--active') : undefined;
                    if (linkIsActive) {
                        this.activeItem = i;
                        if (!this.firstScroll) {
                            this.scrollToItem(firstChild);
                        }
                        this.firstScroll = true;
                    }
                });
            });
        },

        scrollTo(direction) {
            if (!['left', 'right'].includes(direction)) {
                return;
            }

            const tabContent = this.$refs.swTabContent;
            const tabContentWidth = tabContent.offsetWidth;

            if (direction === 'right') {
                tabContent.scrollLeft += (tabContentWidth / 2);
                return;
            }
            tabContent.scrollLeft += -(tabContentWidth / 2);
        },

        checkIfNeedScroll() {
            const tabContent = this.$refs.swTabContent;
            this.isScrollable = tabContent.scrollWidth !== tabContent.offsetWidth;
        },

        setActiveItem(item) {
            this.$emit('newActiveItem', item);
            this.active = item.name;
            this.updateActiveItem();
        },

        scrollToItem(item) {
            const tabContent = this.$refs.swTabContent;
            const tabContentWidth = tabContent.offsetWidth;
            const itemOffset = item.$el.offsetLeft;
            const itemWidth = item.$el.clientWidth;

            if ((tabContentWidth / 2) < itemOffset) {
                const scrollWidth = itemOffset - (tabContentWidth / 2) + (itemWidth / 2);
                tabContent.scrollLeft = scrollWidth;
            }
        }
    }
};
