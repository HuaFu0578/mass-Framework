//=========================================
//  操作流模块
//==========================================
$.define("flow", function(){
    //像mashup，这里抓一些数据，那里抓一些数据，看似不相关，但这些数据抓完后最后构成一个新页面。
    function OperateFlow(){
        this.root = {};
        if(typeof arguments[1] == "function")
            this.bind.apply(this, arguments);
    }
    OperateFlow.prototype = {
        constructor: OperateFlow,
        //names 可以为数组，用逗号作为分隔符的字符串
        bind:function(names,callback,reload){
            var  root = this.root, deps = {},args = [];
            (names +"").replace($.rword,function(name){
                name = "__"+name;//处理toString与valueOf等属性
                if(!root[name]){
                    root[name] ={
                        unfire : [callback],//正在等待解发的回调
                        fired:[]//已经触发的回调
                    }
                }else{
                    root[name].unfire.unshift(callback)
                }
                if(!deps[name]){//去重
                    args.push(name);
                    deps[name] = 1;
                }
            });
            callback.deps = deps;
            callback.args = args;
            callback.reload = !!reload;//默认每次重新加载
        },
        unbind : function(array,fn){//$.multiUnind("aaa,bbb")
            if(/string|number|object/.test(typeof array) ){
                var tmp = []
                (array+"").replace($.rword,function(name){
                    tmp.push( "__"+name)
                });
                array = tmp;
            }
            var removeAll = typeof fn !== "function";
            for(var i = 0, name ; name = array[i++];){
                var obj = this.root[name];
                if(obj && obj.unfire){
                    obj.state = 1;
                    obj.unfire = removeAll ?  [] : obj.unfire.filter(function(el){
                        return fn != el;
                    });
                    obj.fired = removeAll ?  [] : obj.fired.filter(function(el){
                        return fn != el;
                    });
                }
            }
        },
        _args : function (arr){
            for(var i = 0, result = [], el; el = arr[i++];){
                result.push( this.root[el].ret);
            }
            return result;
        },
        fire : function(name, args){
            var root = this.root, obj = root["__"+name], deps;
           
            if(!obj )
                return ;
            obj.ret = args;
            obj.state = 2;
            var unfire = obj.unfire,fired = obj.fired;
                loop:
                for (var i = unfire.length,repeat, fn; fn = unfire[--i]; ) {
                    deps = fn.deps;
                    for(var key in deps){
                        if(deps.hasOwnProperty(key) && root[key].state != 2 ){
                            continue loop;
                        }
                    }
                    unfire.splice(i,1);
                    fired.push(fn);
                    repeat = true;
                }
            if(repeat){
                return this.fire(name, args);
            }else{
                for (i = fired.length; fn = fired[--i]; ) {
                    if(fn.deps["__"+name]){//只处理相关的
                        fn.apply(this,this._args(fn.args));
                        if(fn.reload){//所有数据必须重新加载
                            fired.splice(i,1);
                            unfire.push(fn);
                            for(key in fn.deps){
                                root[key].state = 1;
                            }
                        }
                    }
                }
            }
        }
    }
    $.flow  = function(names,callback,reload){//一个工厂方法
        return new OperateFlow(names,callback,reload)
    }
})
