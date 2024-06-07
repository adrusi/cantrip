import { declare } from "@babel/helper-plugin-utils"
import { types as t } from "@babel/core"

export default declare((api) => {
  return {
    name: "transform-task-bound",

    visitor: {
      AwaitExpression(path) {
        path.node.argument = t.callExpression(
          t.memberExpression(t.identifier("Task"), t.identifier("bound")),
          [path.node.argument],
        )
      },

      ForOfStatement(path) {
        if (path.node.await) {
          const right = path.node.right
          path.node.right = t.callExpression(
            t.memberExpression(t.identifier("Task"), t.identifier("bound")),
            [right],
          )
        }
      },

      VariableDeclaration(path) {
        if (path.node.kind === "await using") {
          const declaration = path.node.declarations[0]
          if (declaration.init) {
            declaration.init = t.callExpression(
              t.memberExpression(t.identifier("Task"), t.identifier("bound")),
              [declaration.init],
            )
          }
        }
      },
    },
  }
})
