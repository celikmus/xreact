import * as React from 'react';
import { mount } from 'enzyme';
import '@reactivex/rxjs'
import X, { x } from '../x';
import * as RX from '../engine/rx'
import { StaticStream } from '../engine'
import Xtest from '../xtest'
const compose = (f, g) => x => f(g(x));
const mountx = compose(mount, x => React.createFactory(X)({ engine: RX }, x))

const CounterView: React.SFC<any> = props => (
  <div className="counter-view">
    <span className="count">{props.count}</span>
  </div>
)

CounterView.defaultProps = { count: 0, overwritedProps: 'inner' }
interface Intent {
  type: string
  value?: any
}

const counterWrapper = x<RX.URI, any, any>((intent$) => {
  return {
    update$: intent$.map((intent: Intent) => {
      switch (intent.type) {
        case 'inc':
          return state => ({ count: state.count + 1 })
        case 'dec':
          intent$.next({ type: 'abs' })
          return state => ({ count: state.count - 1 })
        case 'abs':
          return state => ({ count: Math.abs(state.count) })
        case 'changeWrapperProps':
          return state => ({
            wrapperProps: intent.value,
            overwritedProps: intent.value
          })
        case 'changeDefaultProps':
          return state => ({ count: intent.value })
        default:
          return state => state
      }
    }),
    actions: {
      inc: () => ({ type: 'inc' }),
      dec: () => ({ type: 'dec' }),
      changeWrapperProps: (value) => ({ type: 'changeWrapperProps', value }),
      changeDefaultProps: (value) => ({ type: 'changeDefaultProps', value }),
    }
  }
})

const Counter = counterWrapper(CounterView)
describe('X', () => {
  describe('actions', () => {
    let counterWrapper, counter, t, counterView, actions
    beforeEach(() => {
      counterWrapper = mountx(<Counter />)
      counter = counterWrapper.find(Counter).getNode()
      counterView = counterWrapper.find(CounterView)
      actions = counterView.prop('actions')
      t = new Xtest(counterView.props());
    })
    it('add intent to intent$ and go through sink$', () => {
      return t.plan(3)
        .do([
          actions.inc,
          actions.inc,
          actions.inc
        ])
        .collect(counter)
        .then(x => expect(x.count).toBe(3))
    })

    it('async action', () => {
      return t.plan(3)
        .do([
          actions.inc,
          () => actions.fromEvent({ type: 'inc' }),
          () => actions.fromPromise(Promise.resolve({ type: 'inc' }))
        ])
        .collect(counter)
        .then(state => expect(state.count).toBe(3))
    })

    it('update can also generate new intent', () => {
      return new Xtest({ count: -3 }).plan(3)
        .do([
          counter.machine.actions.dec
        ]).collect(counter)
        .then(state => expect(state.count).toBe(2))
    })
  });

  describe('props', () => {
    let counterWrapper, counter, t, counterView, actions
    beforeEach(() => {
      counterWrapper = mountx(
        <Counter count={9} />
      )
      counter = counterWrapper.find(Counter).getNode()
      counterView = counterWrapper.find(CounterView)
      actions = counterView.prop('actions')
      t = new Xtest(counterView.props());
    })
    it('wrappers props will overwirte components default props', () => {
      return t.plan(1)
        .do([
          counter.machine.actions.inc
        ]).collect(counter)
        .then(state => expect(state.count).toBe(10))
    })
  })

  describe('scope', () => {
    let counterWrapper, counter, t, counterView, actions
    beforeEach(() => {
      counterWrapper = mountx(
        <Counter count={0} wrapperProps={0} overwritedProps={0} />
      )
      counter = counterWrapper.find(Counter)
      counterView = counterWrapper.find(CounterView)
      actions = counterView.prop('actions')
      t = new Xtest(counterView.props());
    })
    it('like scope in function, outter component change overwrited props wont works', () => {
      return t.plan(1)
        .do([
          () => actions.changeDefaultProps(19),
          () => counterWrapper.setProps({ wrapperProps: 1, overwritedProps: 1, count: 9 })
        ]).collect(counter.getNode())
        .then(() => expect(counterView.prop('wrapperProps')).toBe(0))
        .then(() => expect(counterView.prop('overwritedProps')).toBe('inner'))
        .then(() => expect(counterView.prop('count')).toBe(19))
    })
  })

  // describe('composable', () => {
  //   const counterWrapper2 = connect((intent$: Subject<Intent>) => {
  //     return {
  //       update$: intent$.map(intent => {
  //         switch (intent.type) {
  //           case 'inc2':
  //             return state => ({ count: state.count + 2 })
  //           case 'dec2':
  //             return state => ({ count: state.count - 2 })
  //           default:
  //             return state => state
  //         }
  //       }),
  //       actions: {
  //         inc2: () => ({ type: 'inc2' }),
  //         dec2: () => ({ type: 'dec2' }),
  //       }
  //     }
  //   })
  //   let counterWrapper21 = compose(counterWrapper2)(counterWrapper)
  //   const Counter2 = counterWrapper21(CounterView)
  //   //counterWrapper2(counterWrapper(CounterView))
  //   it('counter add inc2, dec2', () => {
  //     let counterWrapperr = TestUtils.renderIntoDocument(
  //       <Most engine={Engine}>
  //         <Counter2 history={true} />
  //       </Most>
  //     )
  //     let counterView = TestUtils.findRenderedComponentWithType(counterWrapperr, CounterView)
  //     let counter2 = TestUtils.findRenderedComponentWithType(counterWrapperr, Counter2)
  //     counterView.props.actions.inc()
  //     counterView.props.actions.inc2()
  //     counterView.props.actions.dec()
  //     expect(stateHistoryOf(counter2)[2].count).toBe(2)
  //   })
  // })

  // describe('convension default to `action` field in sinks', () => {
  //   const Counter = connect((intent$: Subject<Intent>) => {
  //     return {
  //       update$: intent$.map(intent => {
  //         switch (intent.type) {
  //           case 'inc3':
  //             return state => ({ count: state.count + 3 })
  //           default:
  //             return state => state
  //         }
  //       }),
  //       actions: {
  //         inc3: () => ({ type: 'inc3' })
  //       },
  //     }
  //   })(CounterView)

  //   it('counter inc 3', () => {
  //     let counterWrapper = TestUtils.renderIntoDocument(
  //       <Most engine={Engine}>
  //         <Counter history={true} />
  //       </Most>
  //     )
  //     let counter = TestUtils.findRenderedComponentWithType(counterWrapper, Counter)
  //     counter.machine.actions.inc3()
  //     counter.machine.actions.inc3()
  //     expect(stateHistoryOf(counter)[1].count).toBe(6)
  //   })
  // })

  // describe('ERROR', () => {
  //   const Counter = connect((intent$: Subject<Intent>) => {
  //     return {
  //       update$: intent$.map(intent => {
  //         switch (intent.type) {
  //           case 'exception':
  //             throw 'exception in reducer'
  //           case 'inc':
  //             return state => ({ count: state.count + 1 })
  //           default:
  //             return state => state
  //         }
  //       }),
  //       actions: {
  //         throwExeption: () => ({ type: 'exception' }),
  //       },
  //     }
  //   })(CounterView)

  //   it('should recover to identity stream and log exception', () => {
  //     spyOn(console, 'error')
  //     let counterWrapper = TestUtils.renderIntoDocument(
  //       <Most>
  //         <Counter history={true} />
  //       </Most>
  //     )
  //     let counter = TestUtils.findRenderedComponentWithType(counterWrapper, Counter)
  //     return run(intentStreamOf(counter),
  //       dispatch([{ type: 'exception' }], counter),
  //       [
  //         state => expect(console.error).toBeCalledWith('There is Error in your reducer:', 'exception in reducer', undefined)
  //       ])
  //   })

  //   it('should able to catch error in sync mode', () => {
  //     let counterWrapper = TestUtils.renderIntoDocument(
  //       <Most engine={Engine}>
  //         <Counter history={true} />
  //       </Most>
  //     )
  //     let counter = TestUtils.findRenderedComponentWithType(counterWrapper, Counter)
  //     expect(() => {
  //       counter.machine.actions.throwExeption()
  //     }).toThrow('exception in reducer')
  //   })
  // })

  // describe('unsubscribe when component unmounted', () => {
  //   it('unsubscribe', (done) => {
  //     const Counter = connect((intent$: Subject<Intent>) => {
  //       let incForever$ = most.periodic(100, { type: 'inc' }).map(intent => {
  //         done.fail('should not next intent any more')
  //         return _ => _
  //       })
  //       return {
  //         update$: intent$.map(intent => {
  //           switch (intent.type) {
  //             case 'inc':
  //               return state => ({ count: state.count + 1 })
  //             default:
  //               return state => state
  //           }
  //         }).merge(incForever$)
  //       }
  //     })(CounterView)

  //     const TogglableMount = React.createClass({
  //       getInitialState() {
  //         return {
  //           mount: true
  //         }
  //       },
  //       render() {
  //         return this.state.mount && <Counter history={true} />
  //       }
  //     })
  //     spyOn(console, 'error')
  //     let counterWrapper = TestUtils.renderIntoDocument(
  //       <Most engine={Engine}>
  //         <TogglableMount />
  //       </Most>
  //     )
  //     let toggle = TestUtils.findRenderedComponentWithType(counterWrapper, TogglableMount)
  //     let counter = TestUtils.findRenderedComponentWithType(counterWrapper, Counter)
  //     toggle.setState({ mount: false })
  //     done()
  //   })
  // })
})
