<template>
  <imgPreview @close="closePreview" :showing="showImgPre" :imgInfo="preImgInfo" :imgList="preList"
    :startIndex="preStartIndex"></imgPreview>
  <div>
    <pageHeader :title="title"></pageHeader>
    <main id="main">
      <div id="thumbs" class="thumbs-container thumb-listing infinite-scroll">
        <section class="thumb-listing-page" v-for="(sectionItem, i) in pageData.sections">
          <header v-if="i !== 0" class="thumb-listing-page-header">
            <h2>Page <span class="thumb-listing-page-num">{{ i + 1 }}</span> / {{ pageData.totalPage }}</h2>
            <a class="icon to-top" href="#top" title="Back to top">
              <i class="far fa-lg fa-chevron-up"></i>
            </a>
          </header>
          <ul>
            <li v-for="(liItem, index) in sectionItem" :key="index">
              <figure class="thumb" :class="'thumb-' + (liItem.id) + ' thumb-general'"
                      :data-wallpaper-id="liItem.id" style="width:300px;height:200px"
                      @contextmenu.prevent="openCtxMenu($event, liItem)">
                <a class="thumb-btn thumb-btn-fav jsAnchor overlay-anchor" title="设为壁纸" @click="setBg(liItem)">
                  <i class="fas fa-repeat-alt"></i>
                </a>
                <img alt="loading" loading="lazy" style="width: 300px;height: 200px;object-fit:cover"
                     class="lazyload loaded thumb-fade" :data-src="liItem.src === undefined ? liItem.base64 : liItem.src"
                     :src="liItem.src === undefined ? liItem.base64 : liItem.src" @load="onImgLoad"/>
                <a class="preview" @click="handleThumbClick(liItem)" title="单击预览，双击设为壁纸"></a>
                <div class="thumb-info">
                  <span class="wall-res">{{ liItem.resolution }}</span>
                  <a class="jsAnchor overlay-anchor wall-favs"
                     data-href="https://wallhaven.cc/wallpaper/fav/x8kwd3">{{
                      this.$formatFileSize(liItem.file_size)
                    }}</a>
                  <span v-if="liItem.file_type === 'png'" class="png"><span>PNG</span></span>
                  <a class="jsAnchor thumb-tags-toggle delete-btn" title="删除" @click="deleteFile(i,index)">
                    <i class="fas fa-fw fa-trash"></i>
                  </a>
                </div>
              </figure>
            </li>
          </ul>
        </section>
      </div>
      <div class="main-bottom">
        <div class="loading-span" v-show="loading"><i class="fas fa-spinner"></i></div>
        <div class="error-span" v-show="error"><i class="fas fa-times"> <br/>请求异常</i></div>
      </div>
    </main>
    <div class="back-to-top-btn" v-show="showBackTop" @click="scrollTop" title="回到顶部">
      <i class="far fa-lg fa-chevron-up"></i>
    </div>
    <contextMenu :visible="ctxMenu.visible" :x="ctxMenu.x" :y="ctxMenu.y" :items="ctxItems"
                @close="ctxMenu.visible = false" @select="onCtxSelect"></contextMenu>
  </div>
</template>

<script>
import imgPreview from "../components/img_preview.vue";
import contextMenu from "../components/context_menu.vue";
import pageHeader from "../components/page-header.vue";
import {changeBg, getLocalData, deleteFile, showItemInFolder} from "../statics/js/ipcRenderer"
import {ElMessageBox} from 'element-plus'

export default {
  name: "switchList",
  data() {
    return {
      title: "本地列表",
      showImgPre: false,
      preImgInfo: {},
      preList: [],
      preStartIndex: 0,
      clickTimer: null,
      showBackTop: false,
      ctxMenu: {visible: false, x: 0, y: 0, item: null},
      loading: false,
      error: false,
      pageData: {
        totalPage: 0,
        currentPage: 0,
        sections: []
      }
    }
  },
  created: function () {
    this.loading = true;
    this.getNextPage();
  },
  mounted() {
    // 添加滚动事件，检测滚动到页面底部
    window.addEventListener('scroll', this.scrollEvent)
  },
  unmounted() {
    // 移除滚动事件
    window.removeEventListener('scroll', this.scrollEvent)
  },
  components: {
    imgPreview,
    contextMenu,
    pageHeader
  },
  methods: {
    closePreview(value) {
      this.preImgInfo = {};
      this.showImgPre = value;
    },
    preview(imgItem) {
      this.preList = this.flatList;
      this.preStartIndex = Math.max(0, this.flatList.findIndex(it => it.realPath === imgItem.path));
      this.showImgPre = true;
      this.preImgInfo = {
        "realPath": imgItem.path,
        "path": imgItem.base64
      }
    },
    handleThumbClick(imgItem) {
      if (this.clickTimer) {
        clearTimeout(this.clickTimer);
        this.clickTimer = null;
        this.setBg(imgItem);
      } else {
        this.clickTimer = setTimeout(() => {
          this.clickTimer = null;
          this.preview(imgItem);
        }, 220);
      }
    },
    onImgLoad(e) {
      if (e && e.target) e.target.classList.add('thumb-fade-in');
    },
    openCtxMenu(e, item) {
      this.ctxMenu.item = item;
      this.ctxMenu.x = e.clientX;
      this.ctxMenu.y = e.clientY;
      this.ctxMenu.visible = true;
    },
    onCtxSelect(i) {
      const item = this.ctxMenu.item;
      if (!item) return;
      if (i === 0) this.preview(item);
      else if (i === 1) this.setBg(item);
      else if (i === 2) showItemInFolder(item.path);
      else if (i === 3) this.deleteByItem(item);
    },
    deleteByItem(item) {
      for (let s = 0; s < this.pageData.sections.length; s++) {
        const idx = this.pageData.sections[s].findIndex(it => it.path === item.path);
        if (idx > -1) {
          this.deleteFile(s, idx);
          break;
        }
      }
    },
    scrollTop() {
      window.scrollTo({top: 0, behavior: 'smooth'});
    },
    deleteFile(sectionIndex, index) {
      const item = this.pageData.sections[sectionIndex][index]
      ElMessageBox.confirm('确定要删除该壁纸吗？此操作不可恢复。', '删除确认', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteFile(item.path).then(res => {
          this.$message({
            message: res.msg,
            type: res.type,
            duration: res.type === "success" ? 1200 : 2000,
            customClass: 'customer-message'
          })
          if(res.success){
            this.pageData.sections[sectionIndex].splice(index,1)
          }
        })
      }).catch(() => {})
    },
    getNextPage() {
      this.pageData.currentPage++;
      this.loading = true;
      this.error = false
      let params = {
        'page': this.pageData.currentPage,
        'size': 24
      }
      getLocalData(params).then(res => {
        this.pageData.totalPage = res.totalPage;
        this.pageData.sections.push(res.data);
        this.$nextTick(() => {
          this.loading = false;
        });
      }).catch(err => {
        this.$nextTick(() => {
          this.loading = false;
        });
        this.error = true
      })
    },
    scrollEvent() {
      this.showBackTop = document.documentElement.scrollTop > 400;
      if (document.body.scrollHeight - document.documentElement.scrollTop - document.body.clientHeight <= 200 &&
          !this.loading && this.pageData.currentPage < this.pageData.totalPage) {
        this.getNextPage();
      }
    },
    setBg(imgInfo) {
      let imgInfoCopy = {
        "url": imgInfo.path
      }
      changeBg(imgInfoCopy).then(res => {
        this.$message({
          message: res.msg,
          type: res.type,
          duration: res.type === "success" ? 1200 : 2000,
          customClass: 'customer-message'
        })
      })
    }
  },
  computed: {
    flatList() {
      let arr = [];
      this.pageData.sections.forEach(section => {
        section.forEach(item => {
          arr.push({
            realPath: item.path,
            path: item.base64,
            resolution: item.resolution,
            file_size: item.file_size
          });
        });
      });
      return arr;
    },
    ctxItems() {
      return [
        {label: '预览大图', icon: 'far fa-expand'},
        {label: '设为壁纸', icon: 'fas fa-repeat-alt'},
        {label: '打开所在文件夹', icon: 'fas fa-folder-open'},
        {label: '删除', icon: 'fas fa-trash', danger: true}
      ];
    }
  }
}
</script>

<style scoped>
@import url("../statics/css/all.css");
@import url("../statics/css/list.css");

#thumbs {
  padding-top: 10px;
}

.delete-btn{
  color: #cc4433 !important;
}

#main {
  padding-top: 40px;
}

.main-bottom {
  height: 30px;
  text-align: center;
}

.loading-span {
  width: 30px;
  height: 30px;
  margin: 0 auto;
}

.error-span i {
  font-size: 18px !important;
}

.fa-spinner {
  animation: spin 0.8s infinite linear;
}

.main-bottom i {
  font-size: 30px;
  line-height: 1.2;
  font-weight: normal !important;
}

/* 缩略图淡入 */
.thumb-fade {
  opacity: 0;
  transition: opacity .35s ease;
}
.thumb-fade.thumb-fade-in {
  opacity: 1;
}

/* 返回顶部 */
.back-to-top-btn {
  position: fixed;
  right: 30px;
  bottom: 30px;
  z-index: 500;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(34, 34, 34, .8);
  color: #d7ce82;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .5);
  transition: background .25s;
}

.back-to-top-btn:hover {
  background: rgba(34, 34, 34, 1);
}
</style>
