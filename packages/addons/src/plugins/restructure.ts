import {
  FormKitPlugin,
  FormKitSchemaCondition,
  FormKitSchemaNode,
  isComponent,
  isConditional,
  // isConditional,
  isDOM,
} from '@formkit/core'

type Schema = FormKitSchemaNode[] | FormKitSchemaNode | undefined

type ParentMap = Map<FormKitSchemaNode | null, Set<FormKitSchemaNode>>

type SectionMap = Map<string | number | null, Set<FormKitSchemaNode>>

type NodeMap = Map<
  FormKitSchemaNode | null,
  {
    naturalParent: FormKitSchemaNode | null
    naturalIndex: number
    explicitParent: string | undefined
    explicitIndex: number | undefined
  }
>

declare module '@formkit/core' {
  export interface FormKitSchemaMeta {
    section?: string
    parent?: string | number | null
  }
}

export function createMaps(
  node: Schema,
  maps: [NodeMap, ParentMap, SectionMap],
  naturalParent: FormKitSchemaNode | null,
  naturalIndex: number
): [NodeMap, ParentMap, SectionMap] {
  if (node === undefined) return maps
  if (Array.isArray(node)) {
    node.forEach((child, index) =>
      createMaps(child, maps, naturalParent, index)
    )
  } else {
    const [nodeMap, parentMap, sectionMap] = maps
    if (isDOM(node) || isComponent(node)) {
      const explicitParent =
        typeof node.meta?.parent === 'string' ? node.meta.parent : undefined
      const explicitIndex =
        node.meta && isFinite(Number(node.meta.index))
          ? Number(node.meta.index)
          : undefined
      nodeMap.set(node, {
        naturalParent,
        naturalIndex,
        explicitParent,
        explicitIndex,
      })
      if (
        typeof node.meta?.section === 'string' ||
        typeof node.meta?.section === 'number'
      ) {
        sectionMap.set(
          node.meta.section,
          (sectionMap.get(node.meta.section) || new Set()).add(node)
        )
      }
      if (node.children) {
        createMaps(node.children, maps, node, 0)
      }
    } else if (typeof node === 'string') {
      node = {
        $el: 'text',
        children: node,
      }
      nodeMap.set(node, {
        naturalParent,
        naturalIndex,
        explicitParent: undefined,
        explicitIndex: undefined,
      })
    }
    parentMap.set(
      naturalParent,
      (parentMap.get(naturalParent) || new Set()).add(node)
    )
  }
  return maps
}

function createChildren(
  parent: null | FormKitSchemaNode,
  maps: [NodeMap, ParentMap, SectionMap]
): FormKitSchemaNode[] {
  const [nodeMap, parentMap, sectionMap] = maps
  const nodes: FormKitSchemaNode[] = []
  const nodeSet = parentMap.get(parent)
  const parentData = nodeMap.get(parent)
  if (nodeSet === undefined) return nodes
  nodeSet.forEach((node) => {
    const nodeData = nodeMap.get(node)
    if (nodeData?.explicitParent === undefined) {
      nodes.push(nodeData)
    }
  })
  return nodes
}

/**
 * Rebuilds a new schema from the original by using meta.section, meta.parent,
 * and meta.index to determine the correct position of the schema.
 * @param schema - The schema to restructure
 * @returns
 */
function rebuild<
  T extends FormKitSchemaCondition | FormKitSchemaNode[] | undefined
>(schema: T, maps: [NodeMap, ParentMap, SectionMap]): T {
  const [, parentMap] = maps
  if (schema === undefined || schema === null) return schema
  const newSchema = Array.isArray(schema)
    ? createChildren(null, maps)
    : parentMap.get(null)?.values().next().value
  return newSchema
}

export const restructure: FormKitPlugin = function (node) {
  node.hook.schema(
    (
      schema: FormKitSchemaCondition | FormKitSchemaNode[] | undefined,
      next
    ) => {
      const maps = createMaps(
        schema,
        [new Map(), new Map(), new Map()],
        null,
        0
      )
      return rebuild(next(schema), maps)
    }
  )
}
