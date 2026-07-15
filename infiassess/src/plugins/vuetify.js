import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify/lib/framework';
import { VIcon, VChip, VSpacer, VProgressLinear } from 'vuetify/lib';

Vue.use(VueRouter)
Vue.use(Vuetify)

// Globally register the Vuetify components used inside runtime string templates
// (AdminCandidate.vue's inline panels), since a-la-carte imports don't reach them.
Vue.component('VIcon', VIcon)
Vue.component('VChip', VChip)
Vue.component('VSpacer', VSpacer)
Vue.component('VProgressLinear', VProgressLinear)

export default new Vuetify({
    theme: {
        dark: false,
        options: { customProperties: true },
        themes: {
            light: {
                primary: "#111111",
                secondary: "#374151",
                accent: "#111111",
                error: "#DC2626",
                warning: "#D97706",
                info: "#2563EB",
                success: "#16A34A",
                toolbar: "#FFFFFF",
                background: "#F7F7F8",
                surface: "#FFFFFF",
                card: "#FFFFFF",
            }
        },
    }
});
