import React, { Component } from 'react';
// import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { transform } from '@babel/standalone';
import { message } from 'antd';

// import { resetConsole } from 'app/actions/console';
import ControlWidget from './ControlWidget';
import createWrappedConsole from 'app/utils/consoleFactory';
import { subscribeOnCreateQuestionSnapshot } from 'app/utils/question';
import { subscribeOnCreateRecord, updateRecord } from 'app/utils/record';
import UserModal from 'app/components/Modal';
import ReactPage from './ReactPage';
import JavaScriptPage from './JavaScriptPage';

const getPageComponent = args => {
  switch (args.categoryIndex) {
    case 1: {
      return <ReactPage {...args} />;
    }
    default: {
      return <JavaScriptPage {...args} />;
    }
  }
};

class Page extends Component {
  constructor(props) {
    super(props);
    this.state = {
      categoryIndex: 0,
      code: '',
      compiledCode: '',
      questionContent: '',
      test: '',
      tape: [],
      recordId: '',
      console: [],
      intervieweeName: '',
      visibleIntervieweeModal: true,
    };
    this.wrappedConsole = createWrappedConsole(console, this.addConsole);
  }

  componentDidMount() {
    this.subscribeOnCreateRecord();
    this.subscribeOnDispatchQuestion();
  }

  componentWillUnmount() {
    // this.subscriptionDispatchQuestion.unsubscribe();
  }

  updateRecordAction = async newCode => {
    const { recordId } = this.state;
    if (recordId !== '') {
      await updateRecord(recordId, newCode);
    }
  };

  handleCodeChange = newCode => {
    const { test } = this.state;
    const fullCode = `${newCode} ${test}`;

    try {
      const { code: compiledCode } = transform(fullCode, {
        presets: [
          'es2015',
          ['stage-2', { decoratorsBeforeExport: true }],
          'react'
        ],
        plugins: ['proposal-object-rest-spread']
      });
      this.setState({ compiledCode, code: newCode });
      this.updateRecordAction(newCode);
    } catch (e) {
      this.setState({ code: newCode });
      this.resetConsole();
      this.wrappedConsole.log(e);
      this.updateRecordAction(newCode);
    }
  };

  onReset = () => {
    const { questionContent } = this.state;
    this.setState({ code: questionContent });
    this.handleCodeChange(questionContent);
  };

  addTape = newTape => {
    const { tape } = this.state;
    this.setState({ tape: [...tape, newTape] });
  };

  resetTape = () => {
    this.setState({ tape: [] });
  };

  setIntervieweeModal = () => {
    const { visibleIntervieweeModal } = this.state;
    this.setState({ visibleIntervieweeModal: !visibleIntervieweeModal });
  }

  addConsole = (...args) => {
    const { console: _console } = this.state;
    this.setState({ console: [..._console, ...args] });
  };

  resetConsole = () => {
    this.setState({ console: [] });
  };

  setIntervieweeName = name => {
    this.setState({ intervieweeName: name });
    message.success(name);
  }


  subscribeOnCreateRecord = () => {
    const { intervieweeName } = this.state;
    subscribeOnCreateRecord(data => {
      const { id, subjectId } = data;
      if (intervieweeName === subjectId) {
        this.setState({
          recordId: id
        });
      }
    });
  };

  subscribeOnDispatchQuestion = () => {
    subscribeOnCreateQuestionSnapshot(data => {
      const { type, content: code, test } = data;
      this.setState({
        categoryIndex: type === 'javascript' ? 0 : 1,
        code,
        test,
        questionContent: code
      });
      const { questionContent } = this.state;
      this.handleCodeChange(questionContent);
    });
  };

  render() {
    const {
      handleCodeChange,
      wrappedConsole,
      onReset,
      addTape,
      resetTape,
      resetConsole,
      setIntervieweeModal,
      setIntervieweeName,
    } = this;
    const { visibleIntervieweeModal } = this.state;
    return (
      <>
        <ControlWidget
          onReset={() => onReset('javascript')}
          setIntervieweeModal={setIntervieweeModal}
        />
        {getPageComponent({
          handleCodeChange,
          wrappedConsole,
          onReset,
          addTape,
          resetTape,
          resetConsole,
          setIntervieweeModal,
          ...this.state,
          ...this.props
        })}
        <UserModal
          setIntervieweeModal={setIntervieweeModal}
          mustEnterName
          closable
          setIntervieweeName={setIntervieweeName}
          visible={visibleIntervieweeModal}
        />
      </>
    );
  }
}

export default withRouter(Page);
