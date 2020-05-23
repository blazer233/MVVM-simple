	//入口构造函数
	/*
		第一步从拿到的对象中解析出全部数据和全部视图
			 再将每个对象便利拿到每一个对象的属性进行劫持
	*/
	class Mvue {
	    constructor(options) {
	        this.$options = options; //获得对象{data:{},el:''}
	        this.$data = options.data; //获得数据data:{}
	        this.$el = document.querySelector(options.el) //获得视图el:''

	        Object.keys(this.$data).forEach(k => {
	            this.proxyData(k); //便利所有对象,拿到每一个对象的属性
	        })
	        this.init() //初始化
	    }
	    proxyData(key) {
	        Object.defineProperty(this, key, {
	            get: function () {
	                return this.$data[key]
	            },
	            set: function (value) {
	                this.$data[key] = value;
	            }
	        });
	    }
	    init() {
	        this.observer(this.$data) //对数据进行观察
	        new Compile(this); //对this进行编译
	    }
	    observer(data) {
	        if (!data || typeof data !== "object") {
	            return;
	        }
	        Object.keys(data).forEach(key => {
	            this.defineReactive(data, key, data[key]); //递归调用，监听所有属性
	        });
	    }
	    defineReactive(data, key, value) { //递归调用，监听所有属性
	        this.observer(value); //递归监听
	        var dep = new Dep();
	        Object.defineProperty(data, key, {
	            get: function () {
	                if (Dep.target) { //如果有变化,调用函数进行收集
	                    dep.addSub(Dep.target);
	                }
	                return value;
	            },
	            set: function (newVal) {
	                if (value !== newVal) {
	                    value = newVal;
	                    dep.notify(); //通知订阅器进行发布更新
	                }
	            }
	        });
	    }
	}

	//收集发布构造函数

	class Dep {
	    constructor() {
	        this.subs = []
	    }
	    addSub(sub) { //收集
	        this.subs.push(sub); //将自身维系成一个数组
	    }
	    notify() { //发布
	        this.subs.forEach(sub => {
	            sub.update();
	        })
	    }
	}
	Dep.target = null;

	//编译构造函数

	class Compile {
	    constructor(vm) { //vm==this
	        this.vm = vm;
	        this.el = vm.$el;
	        this.fragment = '';
	        this.init()
	    }
	    init() {
	        this.fragment = this.nodeFragment(this.el); //解析视图
	        this.compileNode(this.fragment); //编译视图
	        this.el.appendChild(this.fragment); //视图添加到元素中
	    }
	    nodeFragment(el) { //解析视图函数
	        const fragment = document.createDocumentFragment(); //创建文档碎片
	        let child = el.firstChild; //只要页面中存在子节点就将节点放到文档碎片中
	        while (child) {
	            fragment.appendChild(child);
	            child = el.firstChild;
	        }
	        return fragment; //输出文档碎片集合
	    }
	    compileNode(fragment) { //编译视图函数
	        let childNodes = fragment.childNodes;
	        Array.from(childNodes).forEach(node => {
	            if (node.nodeType === 1) { //如果是元素节点
	                this.compile(node); //调用函数寻找v-model进行编译
	            }
	            if (node.nodeType === 3) { //如果是文本节点
	                let reg = /\{\{(.*)\}\}/; //正则匹配{{}}类型的
	                let text = node.textContent; //选取所有的文本节点
	                if (reg.test(text)) { //如果正则匹配到{{}}文本
	                    let prop = reg.exec(text)[1]; //匹配的文本,则返回一个结果数组
	                    this.compileText(node, prop); //进行文本编译
	                }
	            }
	            //如果存在子节点递归编译
	            if (node.childNodes && node.childNodes.length) {
	                this.compileNode(node);
	            }
	        });
	    }
	    compile(node) { //元素节点编译进行寻找v-model
	        let nodeAttrs = node.attributes;
	        Array.from(nodeAttrs).forEach(attr => {
	            let name = attr.name; //获得所有属性名
	            if (name) {
	                let value = attr.value; //即v-model的属性值
	                if (name === "v-model") {
	                    this.compileModel(node, value); //找到对应地方进行编译
	                }
	            }
	        });
	    }
	    compileModel(node, prop) { //拿到v-model编译到对象模型中,使对象模型值发生改变
	        let val = this.vm.$data[prop]; //数据模型对象中的属性值
	        node.val = typeof val == 'undefined' ? '' : val; //判断存在与否
	        new Watcher(this.vm, prop, (value) => { //进行收集
	            node.value = typeof value == 'undefined' ? '' : value; //判断存在与否
	        });
	        node.addEventListener('input', e => {
	            let newValue = e.target.value;
	            if (val === newValue) { //数据模型对象中的属性值是否等于新输入的值
	                return;
	            }
	            this.vm.$data[prop] = newValue;
	        });
	    }
	    compileText(node, prop) { //对象模型编译到{{}}中,使dom发生改变
	        let text = this.vm.$data[prop];
	        node.textContent = typeof text === 'undefined' ? '' : text; //判断存在与否
	        new Watcher(this.vm, prop, (value) => { //进行发布
	            node.textContent = typeof value === 'undefined' ? '' : value; //判断存在与否
	        });
	    }
	}

	//Watcher进行观测

	class Watcher {
	    constructor(vm, prop, callback) { //vm:this,prop:文本,callback执行检测的回调函数
	        this.vm = vm;
	        this.prop = prop;
	        this.callback = callback;
	        this.value = this.get();
	    }
	    update() {
	        let value = this.vm.$data[this.prop];
	        let oldVal = this.value;
	        if (value !== oldVal) {
	            this.value = value;
	            this.callback(value);
	        }
	    }
	    get() {
	        Dep.target = this; //储存订阅器
	        const value = this.vm.$data[this.prop]; //因为属性被监听，这一步会执行监听器里的 get方法
	        Dep.target = null;
	        return value;
	    }
	}