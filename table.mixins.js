import {Table} from 'element-ui'

const oldDoLayoutHandler = Table.methods.doLayout
Table.methods.doLayout = function (...arg) {
  oldDoLayoutHandler.call(this, ...arg)

  if (this.useVirtual && this.useVirtualColumn) {
    let position = 0

    this.columnsPosition = this.columns.map(({realWidth = 0, width = 0, minWidth = 0}, columnIdx) => {
      return [position, position += Math.max(realWidth, width ? width : minWidth)]
    })

    this.computeScrollToColumn(this.scrollLeft)
  }
}

export default {
  props: {
    rowHeight: {
      type: Number,
      default: 33
    },
    excessRows: {
      type: Number,
      default: 5
    },
    useVirtual: Boolean,
    useRowKey: Boolean,
    useVirtualColumn: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      scrollTop: 0,
      scrollLeft: 0,
      columnsPosition: {},
      innerTop: 0,
      start: 0,
      end: 0,
      columnStart: 0,
      columnEnd: 0
    }
  },
  computed: {
    visibleCount() {
      return Math.ceil(parseFloat(this.height) / this.rowHeight)
    },

    virtualBodyHeight() {
      const {
        data
      } = this.store.states

      return data ? data.length * this.rowHeight : 0
    },
    dataLen() {
      if (this.data) {
        return this.data.length
      } else {
        return 0
      }
    }
  },
  watch: {
    scrollTop: {
      immediate: true,
      handler(top) {
        // 处理滚动后，top为负数，导致部分数据隐藏
        if (top < 0) {
          top = 0
        }
        this.computeScrollToRow(top)
      }
    },
    dataLen() {
      if (this.useVirtual) {
        this.scrollTop = 0
        const that = this
        setTimeout(() => {
          that.bodyWrapper.scrollTop = 0
        }, 400)
      }
    },
    scrollLeft(left) {
      if (this.useVirtualColumn) {
        this.computeScrollToColumn(left)
      }
    },

    virtualBodyHeight() {
      if (this.useVirtual) setTimeout(this.doLayout, 10)
    },

    height() {
      if (this.useVirtual) this.computeScrollToRow(this.scrollTop)
    }
  },
  mounted() {
    if (this.useVirtual) {
      this.bindEvent('bind')
    }
  },
  activated() {
    if (this.useVirtual) {
      // this.scrollTop = 0
      if (this.scrollTop !== 0) {
        const maxHeight = this.data.length * this.rowHeight
        if (this.scrollTop > maxHeight) {
          this.scrollTop = maxHeight
        }
      }
      this.bindEvent('bind')
      const that = this
      setTimeout(() => {
        that.bodyWrapper.scrollTop = this.scrollTop
      }, 400)
    }
  },
  deactivated() {
    if (this.useVirtual) {
      this.bindEvent('unbind')
    }
  },
  beforeDestroy() {
    if (this.useVirtual) {
      this.scrollTop = 0
      this.bindEvent('unbind')
    }
  },
  methods: {
    bindEvent(action) {
      const tableBodyWrapper = this.$el.querySelector('.el-table__body-wrapper')

      if (!this.binded && action === 'bind') {
        tableBodyWrapper.addEventListener('scroll', this.handleScroll)
        this.binded = true
      } else if (this.binded && action === 'unbind') {
        tableBodyWrapper.removeEventListener('scroll', this.handleScroll)
        this.binded = false
      }
    },

    computeScrollToColumn(scrollLeft) {
      let start = 0, end = this.columns.length
      let visibleWidth = 0
      const bodyWidth = this.$el.clientWidth

      for (let i = 0; i < this.columnsPosition.length; i++) {
        const [left, right] = this.columnsPosition[i]

        if (scrollLeft >= left && scrollLeft < right) {
          start = i
          visibleWidth = right - scrollLeft
        } else if (left > scrollLeft) {
          visibleWidth += (right - left)
        }

        if (visibleWidth + this.layout.gutterWidth >= bodyWidth) {
          end = i
          break
        }
      }

      this.columnStart = start
      this.columnEnd = end
    },

    computeScrollToRow(scrollTop) {
      let startIndex = parseInt(scrollTop / this.rowHeight)

      const {start, end} = this.getVisibleRange(startIndex)

      this.start = start
      this.end = end
      this.innerTop = this.start * this.rowHeight
    },

    getVisibleRange(expectStart) {
      const start = expectStart - this.excessRows

      return {
        start: start >= 0 ? start : 0,
        end: expectStart + this.visibleCount + this.excessRows
      }
    },

    handleScroll(e) {
      const ele = e.srcElement || e.target
      let {scrollTop, scrollLeft} = ele
      const bodyScrollHeight = this.visibleCount * this.rowHeight

      if (!this.useRowKey) {
        const focusItem = this.$el.querySelector(':focus')

        focusItem && focusItem.blur()
      }

      // 解决 滚动时 行hover高亮的问题
      this.store.states.hoverRow = null

      if (this.virtualBodyHeight < scrollTop + bodyScrollHeight) {
        scrollTop = this.virtualBodyHeight - bodyScrollHeight
      }

      if (parseInt(this.scrollTop) !== parseInt(scrollTop)) {
        this.scrollTop = scrollTop
      }

      if (parseInt(this.scrollLeft) !== parseInt(scrollLeft)) {
        this.scrollLeft = scrollLeft
      }
    }
  }
}
