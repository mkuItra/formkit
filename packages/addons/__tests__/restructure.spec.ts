import {
  FormKitPlugin,
  FormKitSchemaCondition,
  FormKitSchemaNode,
} from '@formkit/core'

type Schema = FormKitSchemaCondition | FormKitSchemaNode[]

/**
 * Rebuilds a new schema from the original by using meta.section, meta.parent,
 * and meta.index to determine the correct position of the schema.
 * @param schema - The schema to restructure
 * @returns
 */
function rebuild(schema: Schema): Schema {
  return schema
}

export const restructure: FormKitPlugin = function (node) {
  node.hook.schema((schema, next) => {
    return rebuild(next(schema))
  })
}
