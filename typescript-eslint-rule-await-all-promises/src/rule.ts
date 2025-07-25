import type { TSESTree } from "@typescript-eslint/utils"
import { AST_NODE_TYPES } from "@typescript-eslint/utils"
import { ESLintUtils } from "@typescript-eslint/utils"
import * as tsutils from "ts-api-utils"
import * as ts from "typescript"

export type Options = []

export type MessageId = "awaitAllPromises"

// Helper function to check if a type is Promise-like
function isPromiseLike(program: ts.Program, type: ts.Type): boolean {
  const typeParts = tsutils.unionTypeParts(type)

  return typeParts.some((typePart: ts.Type) => {
    const symbol = typePart.getSymbol()
    if (!symbol) {
      return false
    }

    const symbolName = symbol.getName()
    if (symbolName !== "Promise") {
      return false
    }

    // Check if this symbol comes from the default TypeScript library
    const declarations = symbol.valueDeclaration
      ? [symbol.valueDeclaration]
      : symbol.declarations
    if (!declarations || declarations.length === 0) {
      return false
    }

    const sourceFile = declarations[0].getSourceFile()
    return program.isSourceFileDefaultLibrary(sourceFile)
  })
}

export const rule = ESLintUtils.RuleCreator.withoutDocs<Options, MessageId>({
  meta: {
    type: "problem",
    docs: {
      description: "Require all promises to be immediately awaited",
    },
    fixable: "code",
    messages: {
      awaitAllPromises:
        "Promise must be immediately awaited. Add await before this expression.",
    },
    schema: [],
  },
  defaultOptions: [],

  create(context) {
    const services = ESLintUtils.getParserServices(context)
    const checker = services.program.getTypeChecker()

    function isPromiseType(node: TSESTree.Node): boolean {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node)
      const type = checker.getTypeAtLocation(tsNode)
      return isPromiseLike(services.program, type)
    }

    function isImmediatelyAwaited(node: TSESTree.Node): boolean {
      // Check if this node is the argument of an await expression
      const parent = node.parent
      return (
        parent?.type === AST_NODE_TYPES.AwaitExpression &&
        parent.argument === node
      )
    }

    function visitExpression(node: TSESTree.Expression): void {
      // Skip if this expression is already awaited
      if (isImmediatelyAwaited(node)) {
        return
      }

      // Skip if this is not a Promise type
      if (!isPromiseType(node)) {
        return
      }

      // Report the violation
      context.report({
        node,
        messageId: "awaitAllPromises",
        fix(fixer) {
          return fixer.insertTextBefore(node, "await ")
        },
      })
    }

    function visitNode(node: TSESTree.Node): void {
      // Visit all child expressions, but avoid double-visiting
      switch (node.type) {
        case AST_NODE_TYPES.ExpressionStatement:
          visitExpression(node.expression)
          break
        case AST_NODE_TYPES.VariableDeclarator:
          if (node.init) {
            visitExpression(node.init)
          }
          break
        case AST_NODE_TYPES.ReturnStatement:
          if (node.argument) {
            visitExpression(node.argument)
          }
          break
        case AST_NODE_TYPES.AssignmentExpression:
          visitExpression(node.right)
          break
        case AST_NODE_TYPES.ArrayExpression:
          node.elements.forEach((element) => {
            if (element && element.type !== AST_NODE_TYPES.SpreadElement) {
              visitExpression(element)
            }
          })
          break
        case AST_NODE_TYPES.ObjectExpression:
          node.properties.forEach((prop) => {
            if (
              prop.type === AST_NODE_TYPES.Property &&
              prop.value.type !== AST_NODE_TYPES.FunctionExpression &&
              prop.value.type !== AST_NODE_TYPES.ArrowFunctionExpression
            ) {
              visitExpression(prop.value as TSESTree.Expression)
            }
          })
          break
        case AST_NODE_TYPES.ConditionalExpression:
          visitExpression(node.consequent)
          visitExpression(node.alternate)
          break
        case AST_NODE_TYPES.LogicalExpression:
          visitExpression(node.left)
          visitExpression(node.right)
          break
        case AST_NODE_TYPES.TemplateLiteral:
          node.expressions.forEach(visitExpression)
          break
        case AST_NODE_TYPES.ArrowFunctionExpression:
          if (node.async && node.body.type !== AST_NODE_TYPES.BlockStatement) {
            visitExpression(node.body)
          }
          break
      }
    }

    return {
      // Visit all top-level expressions
      ExpressionStatement: visitNode,
      VariableDeclarator: visitNode,
      ReturnStatement: visitNode,
      AssignmentExpression: visitNode,
      ArrayExpression: visitNode,
      ObjectExpression: visitNode,
      ConditionalExpression: visitNode,
      LogicalExpression: visitNode,
      TemplateLiteral: visitNode,
      ArrowFunctionExpression: visitNode,
    }
  },
})

export { rule as awaitAllPromises }
export default rule
