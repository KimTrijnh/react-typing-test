var React = require("react");
require("./sass/app.scss");
require("font-awesome/css/font-awesome.css");
// var excerpts = require("./excerpts.js");

var TextDisplay = React.createClass({
  _getCompletedText: function() {
    if (this.props.lineView) {
      return "";
    }
    return this.props.children.slice(0, this.props.index);
  },
  _getCurrentText: function() {
    var idx = this.props.index;
    var text = this.props.children;
    if (text.slice(idx).indexOf(" ") === -1) {
      return text.slice(idx);
    }
    return text.slice(idx, idx + text.slice(idx).indexOf(" "));
  },
  _getRemainingText: function() {
    var idx = this.props.index;
    var text = this.props.children;
    if (text.slice(idx).indexOf(" ") === -1) {
      return "";
    }
    var wordEnd = idx + text.slice(idx).indexOf(" ");
    if (this.props.lineView) {
      return text
        .slice(wordEnd)
        .split(" ")
        .slice(0, 5)
        .join(" ");
    }
    return text.slice(wordEnd);
  },
  render: function() {
    return (
      <div className={this.props.lineView ? "textDisplay lg" : "textDisplay"}>
        {this._getCompletedText()}
        <span className={this.props.error ? "error" : "success"}>
          {this._getCurrentText()}
        </span>
        {this._getRemainingText()}
      </div>
    );
  }
});

var Clock = React.createClass({
  render: function() {
    var elapsed = Math.round(this.props.elapsed / 100);
    var timer = elapsed / 10 + (elapsed % 10 ? "" : ".0");
    return <span className="timer">{timer}</span>;
  }
});

var TextInput = React.createClass({
  handleChange: function(e) {
    if (!this.props.started) {
      this.props.setupIntervals();
    }
    this.props.onInputChange(e);
  },
  render: function() {
    return (
      <div className="textInput">
        <input
          type="text"
          placeholder="Start typing.."
          className={this.props.error ? "error" : ""}
          ref="textInput"
          value={this.props.value}
          onChange={this.handleChange}
        />
      </div>
    );
  }
});

var ScoreBoard = React.createClass({
  render: function() {
    var score_count = this.props.score_count;
    var top_scores = this.props.top_scores;
    return (
      <div className="scoreBoard">
        <span>{score_count}</span>
      </div>
    );
  }
});

var App = React.createClass({
  componentDidMount: function() {
    var that = this;
    this.intervals = [];
    fetch("https://react-typing-lab.herokuapp.com/excerpt/random")
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        that.setState(
          {
            excerpt: data.text,
            top_scores: data.top_scores,
            score_count: data.score_count,
            excerpt_id: data.id
          },
          function() {
            console.log(this.state.top_scores);
          }
        );
      });
  },
  setInterval: function() {
    this.intervals.push(setInterval.apply(null, arguments));
  },
  getInitialState: function() {
    return {
      index: 0,
      error: false,
      errorCount: 0,
      lineView: false,
      timeElapsed: 0,
      value: "",
      startTime: null,
      wpm: 0,
      excerpt: "",
      completed: false,
      score_count: 0,
      top_scores: []
    };
  },

  _randomElement: function(array) {
    return array[Math.floor(Math.random() * array.length)];
  },
  _getExcerpt: function() {
    var that = this;
    fetch("https://react-typing-lab.herokuapp.com/excerpt/random")
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        that.setState(
          {
            excerpt: data.text,
            top_scores: data.top_scores,
            score_count: data.score_count,
            excerpt_id: data.id
          }
        );
      });
  },
  _postScore: function(data) {
    var that = this;
    fetch("https://react-typing-lab.herokuapp.com/score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    })
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        that.setState({
          top_scores : data.top_scores,
          score_count: data.total_score, 
          message:
            "Congratulation! " +
            data.wpm + " wpm is the #" +
            data.ranking +
            " best score out of " +
            data.total_score + "."
        });
      })
      .catch(function(error) {
        console.log(error);
      });
  },
  _handleInputChange: function(e) {
    if (this.state.completed) {
      return;
    }
    var inputVal = e.target.value;
    var index = this.state.index;
    if (this.state.excerpt.slice(index, index + inputVal.length) === inputVal) {
      if (inputVal.slice(-1) === " " && !this.state.error) {
        // handle a space after a correct word
        this.setState({
          index: this.state.index + inputVal.length,
          value: ""
        });
      } else if (index + inputVal.length == this.state.excerpt.length) {
        // successfully completed
        this.setState(
          {
            value: "",
            completed: true
          },
          function() {
            this._calculateWPM();
            // this._postScore({wpm: this.state.wpm})
          },
          function() {
            console.log(this.state.wpm);
          }
        );

        this.intervals.map(clearInterval);
      } else {
        this.setState({
          error: false,
          value: inputVal
        });
      }
    } else {
      this.setState({
        error: true,
        value: inputVal,
        errorCount: this.state.error
          ? this.state.errorCount
          : this.state.errorCount + 1
      });
    }
  },
  _changeView: function(e) {
    this.setState({ lineView: !this.state.lineView });
  },
  _restartGame: function() {
    // preserve lineView
    var that = this
    var newState = this.getInitialState();
    newState.lineView = this.state.lineView;

    this.setState(newState, function() { that._getExcerpt()});
    
    this.intervals.map(clearInterval);
  },
  _setupIntervals: function() {
    this.setState(
      {
        startTime: new Date().getTime()
      },
      function() {
        // timer
        this.setInterval(
          function() {
            this.setState({
              timeElapsed: new Date().getTime() - this.state.startTime
            });
          }.bind(this),
          50
        );
        // WPM
        this.setInterval(
          function() {
            this._calculateWPM();
          }.bind(this),
          1000
        );
      }
    );
  },
  _calculateWPM: function() {
    var elapsed = new Date().getTime() - this.state.startTime;
    var wpm;
    if (this.state.completed) {
      wpm = (this.state.excerpt.split(" ").length / (elapsed / 1000)) * 60;
      this._postScore({ wpm: wpm, excerpt_id: this.state.excerpt_id });

    } else {
      var words = this.state.excerpt.slice(0, this.state.index).split(" ")
        .length;
      wpm = (words / (elapsed / 1000)) * 60;
    }
    this.setState({
      wpm: this.state.completed ? Math.round(wpm * 10) / 10 : Math.round(wpm)
    });
  },
  render: function() {
    return (
      <div>
        <div className="header">
          <h1>typing speed test</h1>
          <i className="fa fa-lg fa-refresh" onClick={this._restartGame} />
          <i className="fa fa-lg fa-bars" onClick={this._changeView} />
        </div>
        <TextDisplay
          index={this.state.index}
          error={this.state.error}
          lineView={this.state.lineView}
        >
          {this.state.excerpt ? this.state.excerpt : "...loading"}
        </TextDisplay>
        <TextInput
          onInputChange={this._handleInputChange}
          setupIntervals={this._setupIntervals}
          value={this.state.value}
          started={!!this.state.startTime}
          error={this.state.error}
        />
        <div className="messageBox">
          {this.state.message ? <h1 className="message">{this.state.message}</h1> : <span />}
        </div>
        <div className="scoreBoard">
          {this.state.top_scores ? (
            <div>
              <span>
              <small>Total scores:</small>
                <span className="total_score">{this.state.score_count}</span>
              </span>
              <span className="d-flex">
              <small>Top scores:</small>
              {this.state.top_scores.map(function(score) {
                return (
                  <span>
                    <span key={score.score.id} className="score">
                      {score.score.value}
                      <small className="small-text">WPM</small>
                    </span>
                  </span>
                );
              })}
              </span>               
            </div>
          ) : (
            <span>Loading...</span>
          )}
        </div>

        <div className={this.state.completed ? "stats completed" : "stats"}>
          <Clock elapsed={this.state.timeElapsed} />
          <span className="wpm">{this.state.wpm}</span>
          <span className="errors">{this.state.errorCount}</span>
        </div>
        <Footer />
      </div>
    );
  }
});

var Footer = React.createClass({
  render: function() {
    return (
      <div className="footer">
        Source code available on{" "}
        <a
          target="_blank"
          href="https://github.com/sinapinto/react-typing-test"
        >
          Github
        </a>
        . Colorscheme used is{" "}
        <a target="_blank" href="https://github.com/morhetz/gruvbox">
          Gruvbox
        </a>
        .
      </div>
    );
  }
});

React.render(<App />, document.getElementById("container"));
