import highlightedCodeBlock from './highlighted-code-block.js'
import strikethrough from './strikethrough.js'
import tables from './tables.js'
import taskListItems from './task-list-items.js'

function gfm (turndownService) {
  turndownService.use([
    highlightedCodeBlock,
    strikethrough,
    tables,
    taskListItems
  ])
}

export { gfm, highlightedCodeBlock, strikethrough, tables, taskListItems }
