<template>
  <div class="ctx-menu" v-show="visible" :style="{left: x + 'px', top: y + 'px'}" @click.stop
       @contextmenu.prevent.stop>
    <div v-for="(item, i) in items" :key="i"
         class="ctx-item" :class="{disabled: item.disabled, danger: item.danger}"
         @click="onSelect(i)">
      <i v-if="item.icon" :class="item.icon"></i>
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: "contextMenu",
  props: {
    visible: {type: Boolean, default: false},
    x: {type: Number, default: 0},
    y: {type: Number, default: 0},
    items: {type: Array, default: () => []}
  },
  emits: ['close', 'select'],
  mounted() {
    window.addEventListener('click', this.hide);
    window.addEventListener('resize', this.hide);
  },
  beforeUnmount() {
    window.removeEventListener('click', this.hide);
    window.removeEventListener('resize', this.hide);
  },
  methods: {
    hide() {
      if (this.visible) this.$emit('close');
    },
    onSelect(i) {
      const item = this.items[i];
      if (item && item.disabled) return;
      this.$emit('select', i);
      this.$emit('close');
    }
  }
}
</script>

<style scoped>
.ctx-menu {
  z-index: 9999;
  position: fixed;
  min-width: 150px;
  padding: 6px 0;
  background: #2a2b2c;
  border: 1px solid #444;
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, .5);
  user-select: none;
}

.ctx-item {
  padding: 8px 16px;
  color: #ddd;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background .15s, color .15s;
}

.ctx-item:hover {
  background: #026cd1;
  color: #fff;
}

.ctx-item.disabled {
  opacity: .4;
  cursor: not-allowed;
}

.ctx-item.disabled:hover {
  background: transparent;
  color: #ddd;
}

.ctx-item.danger {
  color: #ff6b6b;
}

.ctx-item.danger:hover {
  background: #cc3333;
  color: #fff;
}

.ctx-item i {
  width: 16px;
  text-align: center;
}
</style>
