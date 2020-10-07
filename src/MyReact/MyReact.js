import { textChangeRangeIsUnchanged } from "typescript";

let isFirstRender = false;

const HostRoot = "HostRoot"; // 标识RootFiber类型
const ClassComponent = "ClassComponent"; // 标识组件的类型
const HostComponent = "HostComponent"; // 标识原生dom类型
const HostText = "HostText"; // 表示文本类型
const FunctionComponent = "FunctionComponent"; // 标识函数的组件类型

const NoWork = "NoWork"; // 表示当前节点没有工作，初始都是NoWork
const Placement = "Placement"; // 表示这个节点是新插入的
const Upate = "Update"; // 表示当前节点有更新
const Delection = "Delection"; // 表示当前节点要被删除
const PlacementAndUpdate = "PlacementAndUpdate"; // 一般是节点换位置同时更新了

let nextUnitOfWork = null; //

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

function beginWork(workInProgress) {
  let next;
  return next;
}

function completeUnitOfWork(workInProgress) {
  while (true) {
    let returnFiber = workInProgress.return; // 父节点
    let siblingFiber = workInProgress.sibling; // 兄弟节点

    if (!!siblingFiber) {
      return siblingFiber;
    }
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
