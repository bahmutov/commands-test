/// <reference types="cypress" />

const commandText = (cmd) =>
  `${cmd.attributes.name} ${cmd.attributes.args.map(JSON.stringify).join(', ')}`

const stepBack = (cmd) =>
  cmd.attributes.prev

const stepForward = (cmd) =>
  cmd.attributes.next

const canStepForward = (cmd) =>
  cmd.attributes.next

const findFirstCommand = (cmd) => {
  if (!cmd) {
    return
  }
  if (!cmd.attributes.prev) {
    return cmd
  }
  return findFirstCommand(stepBack(cmd))
}

Cypress.on('fail', (e) => {
  // console.error(e)
  const failedCommand = Cypress.state('current')
  const currentChainerId = failedCommand.attributes.chainerId
  console.log('currentChainerId', currentChainerId)

  const firstCommand = findFirstCommand(failedCommand)
  console.log('very first command', commandText(firstCommand))
  if (!firstCommand) {
    console.log('could not find first command')
    throw e
  }
  console.log(firstCommand.attributes)
  debugger

  // group all commands into chains (lists of commands)
  let cmd = firstCommand
  let chain = null
  const chains = []

  while (cmd) {
    if (!cmd) {
      break
    }

    if (cmd.attributes.type === 'parent') {
      chain = [cmd]
      chains.push(chain)
      cmd = stepForward(cmd)
      continue
    }

    // continue existing chain
    chain.push(cmd)
    cmd = stepForward(cmd)
  }
  console.log('chains', chains)

  console.log(commandText(failedCommand))

  const nextCommand = failedCommand.attributes.next
  console.log(commandText(nextCommand))
})

it('fails', () => {
  cy.wrap({foo: 1}).its('foo').should('equal', 1)
  cy.wrap({bar: 42}).should('be.deep.equal', {bar: 42})

  // failing assertion on purpose
  cy.log('about to fail')
  cy.wrap(2).should('be.equal', 3)

  // another passing command that never runs
  cy.wrap(true).should('equal', true)
})
