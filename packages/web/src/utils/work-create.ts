import type { RouteLocationRaw } from 'vue-router'

export function getFreshWorkCreateRoute(): RouteLocationRaw {
  return {
    name: 'WorkCreate',
    query: {},
  }
}
