/// <reference types="cypress" />

const _ = Cypress._

const commandText = (cmd) =>
  `${cmd.attributes.name} ${cmd.attributes.args.map(JSON.stringify).join(', ')}`

const chainText = (chain) =>
  chain.map(commandText).join('\n')

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

// Cypress.on('fail', (e) => {
function onFailed () {
  if (!this) {
    return
  }
  if (!this.currentTest) {
    return
  }
  if (this.currentTest.state === 'passed') {
    return
  }

  // console.error(e)
  const failedCommand = Cypress.state('current')
  console.log('failed command', failedCommand.attributes)

  const firstCommand = findFirstCommand(failedCommand)
  console.log('very first command', commandText(firstCommand))
  if (!firstCommand) {
    console.log('could not find first command')
    throw e
  }
  console.log(firstCommand.attributes)
  // debugger

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

  const failedChainIndex = _.findIndex(chains, chain => chain.includes(failedCommand))
  console.log('failed chain index', failedChainIndex)

  const N = 5 // how many commands to print before and after
  const passedChaines = _.slice(chains, _.max(0, failedChainIndex - N), failedChainIndex)
  console.log('passed chains', passedChaines)

  const failedChain = chains[failedChainIndex]

  const skippedChains = _.slice(chains, failedChainIndex + 1, failedChainIndex + N)
  console.log('skipped chains', skippedChains)

  // print
  console.group('Passing commands')
  passedChaines.forEach(chain => console.log('%c%s', 'color: green', chainText(chain)))
  console.groupEnd()

  const failedCommandIndex = _.findIndex(failedChain, failedCommand)
  const passedCommandsInFailedChain = _.slice(failedChain, 0, failedCommandIndex)
  const failedCommandsInFailedChain = _.slice(failedChain, failedCommandIndex)

  console.log('%c%s\n%c%s',
    'color: green', chainText(passedCommandsInFailedChain),
    'color: red', chainText(failedCommandsInFailedChain)
  )
  // TODO there might be also skipped commands in the failed chain

  console.group('Skipped commands')
  skippedChains.forEach(chain => console.log('%c%s', 'color: lightGrey', chainText(chain)))
  console.groupEnd()

  cy.task('logCommands', {
    passed: passedChaines.map(chainText),
    failed: {
      good: chainText(passedCommandsInFailedChain),
      bad: chainText(failedCommandsInFailedChain)
    },
    skipped: skippedChains.map(chainText)
  })
}

const _afterEach = afterEach
afterEach = (name, fn) => {
  if (typeof name === 'function') {
    fn = name
    name = fn.name
  }
  // before running the client function "fn"
  // run our "onFailed" to capture the screenshot sooner
  _afterEach(name, function () {
    onFailed.call(this)
    fn()
  })
}

afterEach(onFailed)

it('fails', () => {
  cy.wrap({foo: 1}).its('foo').should('equal', 1)
  cy.wrap({bar: 42}).should('be.deep.equal', {bar: 42})

  // failing assertion on purpose
  cy.log('about to fail')
  cy.wrap({value: 2})
    .should('deep.equal', {value: 2})
    .its('value')
    .should('equal', 2).and('equal', 3)

  // another passing command that never runs
  cy.log('these are commands after failing one')
  cy.wrap(true).should('equal', true)
})
