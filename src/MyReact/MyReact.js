import { type } from "os";
import { textChangeRangeIsUnchanged } from "typescript";

let isFirstRender = false;
let isWorking = false;
let isCommitting = false;

const HostRoot = "HostRoot"; // 标识RootFiber类型
const ClassComponent = "ClassComponent"; // 标识组件的类型
const HostComponent = "HostComponent"; // 标识原生dom类型
const HostText = "HostText"; // 表示文本类型
const FunctionComponent = "FunctionComponent"; // 标识函数的组件类型

const NoWork = "NoWork"; // 表示当前节点没有工作，初始都是NoWork
const Placement = "Placement"; // 表示这个节点是新插入的
const Update = "Update"; // 表示当前节点有更新
const Deletion = "Deletion"; // 表示当前节点要被删除
const PlacementAndUpdate = "PlacementAndUpdate"; // 一般是节点换位置同时更新了

let nextUnitOfWork = null; //

let eventsName = {
  onClick: "click",
  onChange: "change",
  onInput: "input",

  // ...
};

const ClassComponentUpdater = {
  enqueueSetState() {},
};

class FiberNode {
  constructor(tag, key, pendingProps) {
    this.tag = tag; // 当前fiber的类型
    this.key = key;
    this.pendingProps = pendingProps;
    this.type = null; // 'div' | 'h1' | Component
    this.stateNode = null; // 表示当前fiber的实例
    this.child = null; // 当前fiber的子节点， 每个fiber节点有且只有一个指向它的firstChild
    this.sibling = null; // 表示当前节点的兄弟节点 每个fiber节点有且只有一个属性指向隔壁的兄弟节点
    this.return = null; // 表示当前fiber的父节点
    this.index = 0;
    this.memoizedState = null; // 表示当前fiber的state
    this.memoizedProps = null; // 表示当前fiber的props
    this.pendingProps = pendingProps; // 表示新进来的props
    this.effectTag = NoWork; // 表示当前节点要进行何种更新

    // 链表是从firstEffect指向
    this.firstEffect = null; // 表示当前节点的有更新的第一个子节点
    this.lastEffect = null; // 表示当前节点有更新的最后一个子节点
    this.nextEffect = null; // 表示下一个要更新的子节点

    this.alternate = null; // 用来连接current和workInProgress的
    this.updateQueue = null; // 一条链表上面挂载的是当前fiber新的状态
    // 其实还有很多其他的属性
    // expirationTime: 0
  }
}

function createFiber() {
  return new FiberNode();
}

function createWorkInProgress(current, pendingProps) {
  // 复用current.alternate
  let workInProgress = current.alternate;
  if (!workInProgress) {
    workInProgress = createFiber(current.tag, pendingProps, current.key);
    workInProgress.type = current.type;
    workInProgress.stateNode = current.type;
    // 要让这俩东西互相指向
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    workInProgress.effectTag = NoWork;
    workInProgress.firstEffect = null;
    workInProgress.lastEffect = null;
    workInProgress.nextEffect = null;
    // 还有
  }
  // 要保证 current和current.alternate上的updateQueue是同步的
  // 因为，每次执行setState时候会创建新的更新，把更新挂载到组件对应的fiber上
  // 这个fiber，在奇数次更新时，存在于current树上，在偶数次更新时存在于current.alternate
  // 咱们每次创建（或复用）workInProgress 是从current.alternate上拿的对象
  // 复用的这个alternate上 updateQueue上不一定有新的更新
  // 所以这里要判断如果 current.alternate上没有新的更新的话，就说明本轮更新
  // 找到的这个fiber，存在于current树上

  // 源码中没有这个判断，在执行createWorkInProgress之前，调用了一个叫做enqueueUpdate的方法，
  // 这个方法中，它将fiber和current.alternate上的updateQueue的新状态，进行了同步。

  // 只有初次渲染的时候，会给组件的实例一个属性，指向它的fiber，以后这个fiber，就不会再改变了

  //
  if (
    !!workInProgress &&
    !!workInProgress.updateQueue &&
    !workInProgress.updateQueue.lastUpdate
  ) {
    workInProgress.updateQueue = current.updateQueue;
  }

  workInProgress.child = current.child;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  return workInProgress;
}

function reconcileSingleElement(returnFiber, element) {
  let type = element.type;
  let flag = null;
  if (element.$$typeof === Symbol.for("react.element")) {
    if (typeof type === "function") {
      if (type.prototype && type.prototype.isReactComponent) {
        flag = ClassComponent;
      } else if (typeof type === "string") {
        flag = HostComponent;
      }
    } else if (typeof type === "string") {
      flag = HostComponent;
    }

    let fiber = createFiber(flag, element.key, element.props);
    fiber.type = type;
    fiber.return = returnFiber;
    return fiber;
  }
}

function reconcileSingleTextNode(returnFiber, text) {
  let fiber = createFiber(HostText, null, text);
  fiber.return = returnFiber;
  return fiber;
}

function reconcileChildrenArray(workInProgress, nextChildren) {
  // 这个方法中，要通过index和key值去尽可能多的找到可以复用的dom节点
  // 这个函数就是react中最最复杂的diff算法
  let nowWorkInProgress = null;
  if (isFirstRender) {
    nextChildren.forEeach((reactElement, index) => {
      if (index === 0) {
        if (
          typeof reactElement === "string" ||
          typeof reactElement === "number"
        ) {
          workInProgress.child = reconcileSingleTextNode(
            workInProgress,
            reactElement
          );
        } else {
          workInProgress.child = reconcileSingleElement(
            workInProgress,
            reactElement
          );
        }
        nowWorkInProgress = workInProgress.child;
      } else {
        if (
          typeof reactElement === "string" ||
          typeof reactElement === "number"
        ) {
          workInProgress.sibling = reconcileSingleTextNode(
            workInProgress,
            reactElement
          );
        } else {
          workInProgress.sibling = reconcileSingleElement(
            workInProgress,
            reactElement
          );
        }
        nowWorkInProgress = nowWorkInProgress.sibling;
      }
    });
    return workInProgress.child;
  }
}

function reconcileChildrenFiber(workInProgress, nextChildren) {
  if (typeof nextChildren === "object" && !!nextChildren.$$typeof) {
    // 说明它是一个独生子，并且是react元素
    return reconcileSingleElement(workInProgress, nextChildren);
  }
  if (nextChildren instanceof Array) {
    // retrun reconcileChildrenArray(workInProgress, nextChildren)
  }
  if (typeof nextChildren === "string" || typeof nextChildren === "number") {
    // retrun reconcileSingleTextNode(workInProgress, nextChildren)
  }
  return null;
}

function reconcileChildren(workInProgress, nextChildren) {
  if (isFirstRender && !!workInProgress.alternate) {
    workInProgress.child = reconcileChildrenFiber(workInProgress, nextChildren);
    workInProgress.child.effectTag = Placement;
  } else {
    workInProgress.child = reconcileChildrenFiber(workInProgress, nextChildren);
  }
}

function updateHostRoot(workInProgress) {
  let children = workInProgress.memoizedState.element;
  reconcileChildren(workInProgress, children);
}

function updateClassComponent(workInProgress) {
  let component = workInProgress.type;
  let nextProps = workInProgress.pendingProps;

  if (!!component.defaultProps) {
    nextProps = Object.assign({}, component.defaultProps, nextProps);
  }
  let shouldUpdate = null;
  let instance = workInProgress.stateNode;
  if (!instance) {
    // 没有实例说明是初次渲染，或者是一个新创建的节点。
    instance = new component(nextProps);
    workInProgress.memoizedState = instance.state;
    instance._reactInternalFiber = workInProgress;
    instance.updater = ClassComponentUpdater;

    // 用来代替componentWillReceiveProps
    let getDeriveStateFromProps = component.getDerivedStateFromProps;
    if (!!getDeriveStateFromProps) {
      let prevState = workInProgress.memoizedState;
      let newState = getDeriveStateFromProps(nextProps, prevState);
      if (newState === null || newState === undefined) {
        if (typeof newState === "object" && !newState instanceof Array) {
          workInProgress.memoizedState = Object.assign({}, nextProps, newState);
        }
      }
      instance.state = workInProgress.memoizedState;
    }
    // 处理一些声明周期之类的

    shouldUpdate = true;
  } else {
    // 说明不是初次渲染
  }

  let nextChildren = instance.render();
  return reconcileChildren(workInProgress, nextChildren);
}

function updateHostComponent(workInProgress) {
  let nextProps = workInProgress.pendingProps;
  let nextChildren = nextProps.children;

  // 对于文本类型的节点，不一定每次都创建对应的fiber，当这个节点有兄弟节点的时候会创建对应的fiber，当它是独生子的时候不会创建fiber直接返回null
  if (typeof nextChildren === "string" || typeof nextChildren === "number") {
    nextChildren = null;
  }

  return reconcileChildren(workInProgress, nextChildren);
}

function beginWork(workInProgress) {
  let tag = workInProgress.tag;
  let next = null;

  if (tag === HostRoot) {
    next = updateHostRoot(workInProgress);
  } else if (tag === ClassComponent) {
    next = updateClassComponent(workInProgress);
  } else if (tag === HostComponent) {
    next = updateHostComponent(workInProgress);
  } else if (tag === HostText) {
    next = null;
  }

  return next;
}

function completeWork(workInProgress) {
  // 1. 创建真实的dom实例
  let tag = workInProgress.tag;
  let instance = workInProgress.stateNode;
  if (tag === HostComponent) {
    if (!instance) {
      // 说明这个节点是初次创建
      // 也可能是一个新创建的一个节点
      let domElement = document.createElement(workInProgress.type);
      domElement.__reactInternalFiber = workInProgress;
      workInProgress.stateNode = domElement;

      // 2. 对子节点进行插入
      let node = workInProgress.child;
      wapper: while (!!node) {
        let tag = node.tag;
        if (tag === HostComponent || tag === HostText) {
          domElement.appendChild(node.stateNode);
        } else {
          node.child.return = node;
          node = node.child;
          continue;
        }

        if (node === workInProgress) break;

        // 如果当前节点没有兄弟节点，向上查找兄弟节点
        while (node.sibling === null) {
          if (node.return === null || node.return === workInProgress) {
            break wapper; // break外面的while（wapper）
          }
          node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
      }

      // 3. 把属性给它
      let props = workInProgress.pendingProps;
      for (let propKey in props) {
        let propValue = props[propKey];
        // 独生子
        if (propKey === "children") {
          if (typeof propValue === "string" || typeof propValue === "number") {
            domElement.textContent = propValue;
          }
        } else if (propKey === "style") {
          for (let stylePropKey in propValue) {
            if (!propValue.hasOwnProperty(stylePropKey)) continue; // 原型链上的属性
            let styleValue = propValue[stylePropKey].trim(); // 把两边空格去掉
            if (stylePropKey === "float") {
              stylePropKey = "cssFloat";
            }
            domElement.style[stylePropKey] = styleValue;
          }
        } else if (eventsName.hasOwnProperty(propKey)) {
          // react中所有写在JSX模板上的事件都是合成事件。
          // 合成事件不会理解执行传进来的函数，而是先执行一些其他操作。
          // 比如说事件源对象做一些处理进行合成，会把你所有的事件都代理到根节点上。
          // 做事件代理的好处就是全局你可能只用绑定一个事件就可以了。
          // 再比如它内部会自己写个什么阻止冒泡的方式或阻止默认的方法。
          let event = props[propKey];
          domElement.addEventListener(eventsName[propKey], event, false);
        } else {
          domElement.setAttibute(propKey, propValue);
        }
      }
    }
  } else if (tag === HostText) {
    let oldText = workInProgress.memoizedProps;
    let newText = workInProgress.pendingProps;
    if (!instance) {
      instance = document.createTextNode(newText);
      workInProgress.stateNode = instance;
    } else {
      // 不是初次渲染
    }
  }
}

function completeUnitOfWork(workInProgress) {
  while (true) {
    let returnFiber = workInProgress.return; // 父节点
    let siblingFiber = workInProgress.sibling; // 兄弟节点

    // 1. 创建真实的dom实例
    // 2. 对子节点进行插入
    // 3. 把属性给它
    completeWork(workInProgress);

    let effectTag = workInProgress.effectTag;
    let hashChange =
      effectTag === Update || Deletion || Placement || PlacementAndUpdate;
    if (hashChange) {
      if (!!returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = workInProgress;
      } else {
        returnFiber.firstEffect = workInProgress;
      }
      returnFiber.lastEffect = workInProgress;
    }

    if (!!siblingFiber) return siblingFiber;

    // 如果有父节点，回溯，检查当前节点的父节点是否有兄弟节点和父节点
    if (!!returnFiber) {
      workInProgress = returnFiber;
      continue;
    }
  }
}

function performUnitOfWork(workInProgress) {
  let next = beginWork(workInProgress); // 创建当前节点的子节点

  if (next === null) {
    next = completeUnitOfWork(workInProgress);
  }

  return next;
}

// 循环创建Fiber树
function workLoop(nextUnitOfWork) {
  // 有下一个要被调度的节点
  while (!!nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
}

function commitRoot(root, finishedWord) {
  isWorking = true;
  isCommitting = true;

  // 三个while循环。
  // 第一个循环，用来执行getSnapshotBeforeUpdate。
  // 第二个循环，真正用来操作页面，将有更新的节点，该插入的插入，该更新的更新，该删除的删除。
  // 第三个循环，执行剩下的声明周期， componentDidUpdate或者componentDidMount

  let firstEffect = finishedWord.firstEffect;
  let nextEffect = null;

  nextEffect = firstEffect;
  //
  // while(){

  // }

  nextEffect = firstEffect;
  while (!!nextEffect) {
    let effectTag = nextEffect.effectTag;
    if (effectTag.includes(Placement)) {
      // 说明是新插入的节点
      // 1. 先找到一个能被插进来的父节点
      // 2. 再找能往父节点中插的子节点
      let parentFiber = nextEffect.return;
      let parent = null; // 父节点真实对应的dom节点
      while (!!parentFiber) {
        let tag = parentFiber.tag;
        if (tag === HostComponent || tag === HostRoot) {
          break;
        }
        if (parentFiber.tag === HostComponent) {
          parent = parentFiber.stateNode;
        } else if (parentFiber.tag === HostRoot) {
          parent = parentFiber.stateNode.container;
        }

        if (isFirstRender) {
          let tag = nextEffect.tag;
          if (tag === HostComponent || tag == HostText) {
            parent.appendChild(nextEffect.stateNode);
          } else {
            let child = nextEffect;
            while (true) {
              let tag = child.tag;
              if (tag === HostComponent || tag === HostText) {
                break;
              }
              child = child.child;
            }
            parent.appendChild(child.stateNode);
          }
        }
      }
    } else if (effectTag === Update) {
      // 说明属性更新
    } else if (effectTag === Deletion) {
      //该节点要被删除
    } else if (effectTag === PlacementAndUpdate) {
      // 说明该节点可能是换了位置并属性上有更新
    }
  }

  nextEffect = firstEffect;
  // while(){

  // }
  isWorking = false;
  isCommitting = false;
}

function completeRoot(root, finishedWord) {
  root.finishedWord = null;
  commitRoot(root, finishedWord);
}

class ReactRoot {
  constructor(container) {
    this._internalRoot = this._createRoot(container);
  }

  _createRoot(container) {
    let uninitialFiber = this._createUninitialFiber();

    let root = {
      container: container,
      current: null,
      finishedWord: null,
    };
    return root;
  }

  _createUninitialFiber(tag, key, pendingProps) {
    return createFiber(tag, key, pendingProps);
  }

  render(reactElement, callback) {
    let root = this._internalRoot;

    let workInProgress = createWorkInProgress(root.current, null);
    // react源码中是先把element放到current中。
    workInProgress.memoizedState = { element: reactElement };

    nextUnitOfWork = workInProgress;
    workLoop(nextUnitOfWork);

    root.finishedWord = root.current.alternate;
    if (!!root.finishedWord) {
      compeleteRoot(root, root.finishedWord);
    }
  }
}

const ReactDOM = {
  render(reactElement, container, callback) {
    isFirstRender = true;
    let root = new ReactRoot(container);
    container._reactRootContainer = root;
    root.render(reactElement, callback);

    isFirstRender = false;
  },
};

// 123：00

export default ReactDOM;
