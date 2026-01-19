import DefaultTheme from 'vitepress/theme-without-fonts';
import { EnhanceAppContext } from 'vitepress';
import Layout from './Layout.vue';
import IndexList from './components/IndexList.vue';
import ImplVariantsHint from './components/implvariants/ImpVariantsHint.vue';
import StatusBadge from './components/StatusBadge.vue';
import Alpha from './components/Alpha.vue';
import Beta from './components/Beta.vue';
import Legacy from './components/Legacy.vue';
import Gamma from './components/Gamma.vue';
import Concept from './components/Concept.vue'
import Since from './components/Since.vue';
import UnderConstruction from './components/UnderConstruction.vue';
// import ScrollToTop from './components/ScrollToTop.vue'
import CfgInspect from './components/ConfigInspect.vue';
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'

import '@shikijs/vitepress-twoslash/style.css'
import './styles.scss'
import './alerts.scss'
import './code.scss'

/**
 * @type {import('vitepress/theme')}
 */
export default {
  extends: DefaultTheme,
  Layout: Layout,
  enhanceApp(ctx: EnhanceAppContext) {
    ctx.app.component('Config', CfgInspect)
    ctx.app.component('IndexList', IndexList)
    ctx.app.component('ImplVariantsHint', ImplVariantsHint)
    ctx.app.component('StatusBadge', StatusBadge)
    ctx.app.component('Alpha', Alpha)
    ctx.app.component('Beta', Beta)
    ctx.app.component('Legacy', Legacy)
    ctx.app.component('Gamma', Gamma)
    ctx.app.component('Concept', Concept)
    ctx.app.component('Since', Since)
    ctx.app.component('UnderConstruction', UnderConstruction)
    // ctx.app.component('ScrollToTop', ScrollToTop)
    ctx.app.use(TwoslashFloatingVue)
  }
}