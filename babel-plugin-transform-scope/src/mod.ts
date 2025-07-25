import { addNamed } from "@babel/helper-module-imports"
import { declare } from "@babel/helper-plugin-utils"
import { types as t } from "@babel/core"

import type { NodePath } from "@babel/traverse"

export default declare((_api) => {
  const awaitHookImports: string[] = []
  const forAwaitHookImports: string[] = []
  const awaitUsingHookImports: string[] = []

  function getAwaitHookIdent(path: NodePath): t.Identifier {
    for (const name of awaitHookImports) {
      if (path.scope.hasGlobal(name)) return t.identifier(name)
    }

    const ident = addNamed(path, "awaitHook", "@cantrip/scope")
    path.scope.addGlobal(ident)
    awaitHookImports.push(ident.name)
    return ident
  }

  function getForAwaitHookIdent(path: NodePath): t.Identifier {
    for (const name of forAwaitHookImports) {
      if (path.scope.hasGlobal(name)) return t.identifier(name)
    }

    const ident = addNamed(path, "forAwaitHook", "@cantrip/scope")
    path.scope.addGlobal(ident)
    forAwaitHookImports.push(ident.name)
    return ident
  }

  function getAwaitUsingHookIdent(path: NodePath): t.Identifier {
    for (const name of awaitUsingHookImports) {
      if (path.scope.hasGlobal(name)) return t.identifier(name)
    }

    const ident = addNamed(path, "awaitUsingHook", "@cantrip/scope")
    path.scope.addGlobal(ident)
    awaitUsingHookImports.push(ident.name)
    return ident
  }

  return {
    name: "transform-task-bound",

    visitor: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      AwaitExpression(path) {
        const awaitHookIdent = getAwaitHookIdent(path)
        path.node.argument = t.callExpression(awaitHookIdent, [
          path.node.argument,
        ])
      },

      // eslint-disable-next-line @typescript-eslint/naming-convention
      ForOfStatement(path) {
        if (path.node.await) {
          const forAwaitHookIdent = getForAwaitHookIdent(path)
          const right = path.node.right
          path.node.right = t.callExpression(forAwaitHookIdent, [right])
        }
      },

      // eslint-disable-next-line @typescript-eslint/naming-convention
      VariableDeclaration(path) {
        if (path.node.kind === "await using") {
          const declaration = path.node.declarations[0]
          if (declaration.init) {
            const awaitUsingHookIdent = getAwaitUsingHookIdent(path)
            declaration.init = t.callExpression(awaitUsingHookIdent, [
              declaration.init,
            ])
          }
        }
      },
    },
  }
})
