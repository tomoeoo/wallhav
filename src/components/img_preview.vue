<template>
  <div class="mask" :class="showing === true ? '' : 'out'" @click.self="close">
    <a class="close_btn" @click="close" title="关闭 (ESC)"></a>
    <!-- 翻页箭头 -->
    <a class="nav-arrow nav-prev" v-show="canPrev" @click="prev" title="上一张 (←)">
      <i class="far fa-lg fa-chevron-left"></i>
    </a>
    <a class="nav-arrow nav-next" v-show="canNext" @click="next" title="下一张 (→)">
      <i class="far fa-lg fa-chevron-right"></i>
    </a>
    <div class="img-view">
      <img :key="displaySrc" class="img-class" :src="displaySrc" :style="{'max-height':calHeight}"
        referrerpolicy="no-referrer" @load="onImgLoad" @error="onImgError">
      <div class="img-loading" v-show="imgLoading"><i class="fas fa-spinner"></i></div>
      <img class="img-class close-bg" v-show="!showing" :src="imgBgSrc" :style="{'max-height':calHeight}" referrerpolicy="no-referrer">
    </div>
    <!-- 底部信息栏 -->
    <div class="preview-info-bar" v-show="showing">
      <span class="info-item" v-if="currentResolution"><i class="far fa-expand"></i> {{ $formatMulti(currentResolution) }}</span>
      <span class="info-item" v-if="currentSize"><i class="far fa-weight-hanging"></i> {{ $formatFileSize(currentSize) }}</span>
      <span class="info-item index-item" v-if="listLen > 1">{{ currentIndex + 1 }} / {{ listLen }}</span>
    </div>
    <div class="sidebar-fixed-wrapper">
      <div class="details-sidebar-fixed-box hi-de">
        <div class="sidebar-fixed_box comments-middle-icon" title="设为壁纸 (S)" @click="setBg(currentImg)">
          <div class="icon-wrap"><i class="fas fa-repeat-alt"></i></div>
        </div>
        <div v-show="!isLocal" class="sidebar-fixed_box share-middle-icon sidebar-share" title="下载 (D)"
             @click="downloadImg(currentImg)">
          <div class="icon-wrap"><i class="fas fa-download"></i></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {changeBg} from "../statics/js/ipcRenderer";

export default {
  name: "imgPreview",
  data() {
    return {
      isLocal: false,
      clientHeight: 1080,
      imgBgSrc: "",
      currentIndex: 0,
      imgLoading: false,
      preloadedUrls: {}
    }
  },
  props: {
    showing: {
      type: Boolean,
      default: false
    },
    imgInfo: {
      type: Object,
      default: () => ({})
    },
    // 可选：传入列表以支持翻页
    imgList: {
      type: Array,
      default: null
    },
    startIndex: {
      type: Number,
      default: 0
    }
  },
  mounted() {
    this.clientHeight = document.documentElement.clientHeight;
    window.addEventListener('resize', this.onresize);
    window.addEventListener('keydown', this.handleKeydown);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('resize', this.onresize);
  },
  methods: {
    onresize() {
      if (document.documentElement.clientHeight !== undefined) {
        this.clientHeight = document.documentElement.clientHeight;
      }
    },
    handleKeydown(e) {
      if (!this.showing) return;
      switch (e.key) {
        case 'Escape':
          this.close();
          break;
        case 'ArrowLeft':
          this.prev();
          break;
        case 'ArrowRight':
          this.next();
          break;
        case 's':
        case 'S':
          this.setBg(this.currentImg);
          break;
        case 'd':
        case 'D':
          if (!this.isLocal) this.downloadImg(this.currentImg);
          break;
      }
    },
    prev() {
      if (this.canPrev) this.currentIndex--;
    },
    next() {
      if (this.canNext) this.currentIndex++;
    },
    close() {
      this.imgBgSrc = this.currentImg ? (this.currentImg.path) : "";
      this.isLocal = false
      this.$emit('close', false)
    },
    setBg(imgItem) {
      if (!imgItem) return;
      let info;
      if (this.isLocal) {
        info = {
          "url": imgItem.realPath
        }
      } else {
        info = {
          "id": imgItem.id,
          "url": imgItem.path,
          "size": imgItem['file_size'],
          "small": imgItem['thumbs'].small,
          "resolution": imgItem.resolution
        }
      }
      changeBg(info).then(res => {
        this.$message({
          message: res.msg,
          type: res.type,
          duration: res.type === "success" ? 1200 : 2000,
          customClass: 'customer-message'
        })
      })
    },
    downloadImg(imgItem) {
      if (!imgItem) return;
      let info = {
        "id": imgItem.id,
        "url": imgItem.path,
        "size": imgItem['file_size'],
        "small": imgItem['thumbs'].small,
        "resolution": imgItem.resolution
      }
      this.$root.addDownloadFile(info).then(res => {
        this.$message({
          message: res.msg,
          type: res.type,
          duration: res.type === "success" ? 1200 : 2000,
          customClass: 'customer-message'
        })
      })
    },
    updateLocalFlag() {
      const img = this.currentImg;
      this.isLocal = !!(img && img.realPath !== undefined);
    },
    getImageUrl(img) {
      if (!img) return '';
      if (img.realPath !== undefined) return img.realPath || img.path;
      return img.path;
    },
    // 预加载相邻图片到浏览器缓存
    preloadAdjacent() {
      if (this.listLen <= 1) return;
      if (this.canNext) {
        this.preloadImage(this.getImageUrl(this.innerList[this.currentIndex + 1]));
      }
      if (this.canPrev) {
        this.preloadImage(this.getImageUrl(this.innerList[this.currentIndex - 1]));
      }
    },
    preloadImage(url) {
      if (!url || this.preloadedUrls[url]) return;
      this.preloadedUrls[url] = true;
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = url;
    },
    onImgLoad() {
      this.imgLoading = false;
    },
    onImgError() {
      this.imgLoading = false;
    }
  },
  computed: {
    // 实际使用的列表：优先 imgList，否则退化为 [imgInfo]
    innerList() {
      if (this.imgList && this.imgList.length > 0) return this.imgList;
      return this.imgInfo ? [this.imgInfo] : [];
    },
    listLen() {
      return this.innerList.length;
    },
    currentImg() {
      return this.innerList[this.currentIndex] || {};
    },
    canPrev() {
      return this.listLen > 1 && this.currentIndex > 0;
    },
    canNext() {
      return this.listLen > 1 && this.currentIndex < this.listLen - 1;
    },
    currentResolution() {
      const img = this.currentImg;
      return this.isLocal ? img.resolution : img.resolution;
    },
    currentSize() {
      const img = this.currentImg;
      return this.isLocal ? img.file_size : img.file_size;
    },
    calHeight() {
      return parseInt(this.clientHeight * 0.9) + "px";
    },
    displaySrc() {
      if (this.isLocal) {
        return this.currentImg.realPath || this.currentImg.path;
      }
      return this.currentImg.path;
    }
  },
  watch: {
    showing(val) {
      if (val) {
        // 打开时重置索引
        let start = this.startIndex || 0;
        if (start >= this.listLen) start = this.listLen - 1;
        if (start < 0) start = 0;
        this.currentIndex = start;
        this.updateLocalFlag();
        this.imgLoading = true;
        this.$nextTick(() => this.preloadAdjacent());
      }
    },
    imgInfo() {
      this.updateLocalFlag();
    },
    imgList() {
      this.updateLocalFlag();
    },
    currentImg() {
      this.updateLocalFlag();
      this.imgLoading = true;
      this.preloadAdjacent();
    }
  }
}
</script>

<style scoped>
.close_btn {
  z-index: 999;
  display: inline-block;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  position: absolute;
  top: 20px;
  right: 40px;
  text-decoration: none;
  background: url(../statics/icons/icon-s-close-hover.svg) center no-repeat #222;
  opacity: 0.85;
}

.close_btn:hover {
  opacity: 1;
}

/* 翻页箭头 */
.nav-arrow {
  z-index: 999;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 34, 34, 0.6);
  color: #d7ce82;
  cursor: pointer;
  transition: background .25s;
}

.nav-arrow:hover {
  background: rgba(34, 34, 34, 0.9);
}

.nav-prev {
  left: 30px;
}

.nav-next {
  right: 30px;
}

/* 底部信息栏 */
.preview-info-bar {
  z-index: 999;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 24px;
  text-align: center;
  color: #ddd;
  font-size: 14px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, .8);
}

.preview-info-bar .info-item {
  display: inline-block;
  margin: 0 14px;
}

.preview-info-bar .info-item i {
  margin-right: 4px;
  opacity: .8;
}

.preview-info-bar .index-item {
  color: #d7ce82;
}

.sidebar-fixed-wrapper {
  color: #000000;
  position: fixed;
  right: 40px;
  bottom: 70px;
  z-index: 999;
}

.comments-middle-icon,
.share-middle-icon {
  border: 1px solid #E9E9E9;
  background-color: #222;
  -webkit-transition: background .3s;
  transition: background .3s;
}

.icon-wrap {
  position: relative;
  top: 12px;
  width: 21px;
  margin: 0 auto;
  color: #d7ce82;
}

.sidebar-fixed-wrapper .sidebar-fixed_box {
  color: #d3dce6;
  width: 50px;
  height: 50px;
  margin-top: 10px;
  cursor: pointer;
  border: none;
  position: relative;
  background-repeat: no-repeat;
  background-position: center;
  border-radius: 4px;
  font-size: 20px;
}


.img-class {
  object-fit: cover;
  max-width: 95%;
}


.mask {
  z-index: 999;
  width: 100%;
  height: 100%;
  position: fixed;
  margin: auto;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.88);
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  display: table;
}

.mask.out {
  opacity: 0;
  visibility: hidden
}

.img-view {
  text-align: center;
  display: table-cell;
  vertical-align: middle;
  width: auto;
  margin-left: auto;
}

.img-class {
  margin: 0 auto;
}

.img-view > img {
  border-radius: 3px;
  box-shadow: 0 1px 1px 1px #222, 5px 5px 5px rgb(84 84 84 / 50%);
  transition: opacity 0.2s ease;
}

/* 加载中指示器 */
.img-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 998;
}

.img-loading .fa-spinner {
  font-size: 32px;
  color: #d7ce82;
  animation: spin 0.8s infinite linear;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}


/*弹层动画（淡入淡出）*/
.mask {
  transition: opacity 0.3s;
  -moz-transition: opacity 0.3s;
  -webkit-transition: opacity 0.3s;
  -o-transition: opacity 0.3s;
  visibility: visible;
  opacity: 1;
}
</style>
