import { declare } from "@babel/helper-plugin-utils"
import { addNamed } from "@babel/helper-module-imports"
import { types as t } from "@babel/core"
import type { Binding, NodePath } from "@babel/traverse"

export default declare((api) => {
  const taskImports: string[] = []

  function getTaskIdent(path: NodePath): t.Identifier {
    for (const name of taskImports) {
      if (path.scope.hasGlobal(name)) return t.identifier(name)
    }

    const ident = addNamed(path, "Task", "@cantrip/task")
    path.scope.addGlobal(ident)
    taskImports.push(ident.name)
    return ident
  }

  return {
    name: "transform-task-bound",

    visitor: {
      AwaitExpression(path) {
        const taskIdent = getTaskIdent(path)
        path.node.argument = t.callExpression(
          t.memberExpression(taskIdent, t.identifier("bound")),
          [path.node.argument],
        )
      },

      ForOfStatement(path) {
        if (path.node.await) {
          const taskIdent = getTaskIdent(path)
          const right = path.node.right
          path.node.right = t.callExpression(
            t.memberExpression(taskIdent, t.identifier("bound")),
            [right],
          )
        }
      },

      VariableDeclaration(path) {
        if (path.node.kind === "await using") {
          const declaration = path.node.declarations[0]
          if (declaration.init) {
            const taskIdent = getTaskIdent(path)
            declaration.init = t.callExpression(
              t.memberExpression(taskIdent, t.identifier("bound")),
              [declaration.init],
            )
          }
        }
      },
    },
  }
})
