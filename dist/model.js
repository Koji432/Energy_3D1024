export const clamp = (n, a=0, b=1) => Math.min(b,Math.max(a,n));
export const smooth = t => { t=clamp(t); return t*t*(3-2*t); };
export const phase = (t,start,end) => smooth((t-start)/(end-start));
export const devices = {
  flashlight: {name:'懐中電灯', roles:['source','switch','resistor','led']},
  fan: {name:'扇風機', roles:['source','switch','motor']},
  drone: {name:'ドローン', roles:['source','switch','controller','motor1','motor2','motor3','motor4']},
};
export const partNames={source:'電源',switch:'スイッチ',resistor:'抵抗',led:'LED',motor:'モーター',controller:'制御基板',motor1:'モーター1',motor2:'モーター2',motor3:'モーター3',motor4:'モーター4'};
export const initialState = () => ({device:'flashlight',view:'model',progress:0,direction:0,power:false,selected:null});
export function transition(state, action) {
  switch(action.type){
    case 'DEVICE': return devices[action.device] ? {...initialState(),device:action.device} : state;
    case 'DISASSEMBLE': return {...state,view:'model',progress:state.view==='circuit'?0:state.progress,direction:state.view==='circuit'||state.progress<1?1:0,power:false};
    case 'BACK': return {...state,view:'model',direction:state.progress>0?-1:0,power:false,selected:null};
    case 'REFRESH': return {...state,view:'circuit',direction:0,power:false,selected:null};
    case 'POWER': return state.view==='circuit'?{...state,power:!state.power}:state;
    case 'SELECT': return devices[state.device].roles.includes(action.role)?{...state,selected:state.selected===action.role?null:action.role}:state;
    default:return state;
  }
}
export function animationStep(progress,direction,seconds,duration=3.4){
  const value=clamp(progress+direction*seconds/duration);
  return {value,direction:value===0||value===1?0:direction};
}
