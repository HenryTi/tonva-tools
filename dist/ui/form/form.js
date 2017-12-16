"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const mobx_react_1 = require("mobx-react");
let Form = class Form extends React.Component {
    render() {
        let { children, formSchema } = this.props;
        let content;
        if (children === undefined) {
            let sep;
            content = [];
            formSchema.inputs.forEach((v, index) => {
                sep = formSchema.renderSeperator(v);
                if (sep !== null)
                    content.push(sep);
                content.push(formSchema.renderField(v));
            });
            sep = formSchema.renderSeperator();
            if (sep !== null)
                content.push(sep);
            content.push(formSchema.renderButtons());
        }
        else
            content = children;
        return React.createElement("div", { className: 'container' },
            React.createElement("form", { onSubmit: formSchema.onSubmit }, content));
    }
};
Form = __decorate([
    mobx_react_1.observer
], Form);
exports.Form = Form;
//# sourceMappingURL=form.js.map