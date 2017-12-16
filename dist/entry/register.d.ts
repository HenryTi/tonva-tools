/// <reference types="react" />
import * as React from 'react';
import { SubmitReturn } from '../ui';
export interface Values {
    user: string;
    pwd: string;
    rePwd: string;
    country?: string;
    mobile?: string;
    email?: string;
}
export interface Props {
}
export interface State {
    values: Values;
    disabled: boolean;
    pwdError: boolean;
    regError: string;
}
export default class Register extends React.Component<{}, null> {
    private schema;
    onLoginSubmit(values: any): Promise<SubmitReturn | undefined>;
    click(): void;
    render(): JSX.Element;
}