import { ActionType } from './RtcContext';
import { UIKitUser, CallbacksInterface } from './PropsContext';
declare type stateType = {
    max: UIKitUser[];
    min: UIKitUser[];
};
export declare const initState: {
    max: UIKitUser[];
    min: UIKitUser[];
};
declare const reducer: (state: stateType, action: ActionType<keyof CallbacksInterface>) => {
    max: UIKitUser[];
    min: UIKitUser[];
};
export default reducer;
