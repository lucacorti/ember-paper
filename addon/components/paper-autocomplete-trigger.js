/**
 * @module ember-paper
 */
import { not, oneWay } from '@ember/object/computed';

import Component from '@ember/component';
import { isBlank, isPresent } from '@ember/utils';
import { run } from '@ember/runloop';
import { computed, get } from '@ember/object';
import layout from '../templates/components/paper-autocomplete-trigger';

/**
 * @class PaperAutocompleteTrigger
 * @extends Ember.Component
 */
export default Component.extend({
  layout,
  tagName: 'md-autocomplete-wrap',
  classNameBindings: ['noLabel:md-whiteframe-z1', 'select.isOpen:md-menu-showing', 'showingClearButton:md-show-clear-button'],

  noLabel: not('extra.label'),
  _innerText: oneWay('searchText'),

  showingClearButton: computed('allowClear', 'disabled', 'resetButtonDestroyed', function() {
    // make room for clear button:
    // - if we're enabled
    // - or if we're disabled but the button still wasn't destroyed
    return this.get('allowClear') && (
      !this.get('disabled') || (this.get('disabled') && !this.get('resetButtonDestroyed'))
    );
  }),

  text: computed('select', 'searchText', '_innerText', {
    get() {
      let {
        select,
        searchText,
        _innerText
      } = this.getProperties('select', 'searchText', '_innerText');

      if (select && select.selected) {
        return this.getSelectedAsText();
      }
      return searchText ? searchText : _innerText;
    },
    set(_, v) {
      let { select, searchText } = this.getProperties('select', 'searchText');
      this.set('_innerText', v);

      // searchText should always win
      if (!(select && select.selected) && isPresent(searchText)) {
        return searchText;
      }

      return v;
    }
  }),

  // Lifecycle hooks
  didUpdateAttrs() {
    this._super(...arguments);
    /*
     * We need to update the input field with value of the selected option whenever we're closing
     * the select box. But we also close the select box when we're loading search results and when
     * we remove input text -- so protect against this
     */
    let oldSelect = this.get('_oldSelect');
    let oldLastSearchedText = this.get('_lastSearchedText');
    let oldLoading = this.get('_loading');
    let oldDisabled = this.get('_lastDisabled');

    let select = this.get('select');
    let loading = this.get('loading');
    let searchText = this.get('searchText');
    let lastSearchedText = this.get('lastSearchedText');
    let disabled = this.get('disabled');

    if (oldSelect && oldSelect.isOpen && !select.isOpen && !loading && searchText) {
      this.set('text', this.getSelectedAsText());
    }

    if (lastSearchedText !== oldLastSearchedText) {
      if (isBlank(lastSearchedText)) {
        run.schedule('actions', null, select.actions.close, null, true);
      } else {
        run.schedule('actions', null, select.actions.open);
      }
    } else if (!isBlank(lastSearchedText) && get(this, 'options.length') === 0 && this.get('loading')) {
      run.schedule('actions', null, select.actions.close, null, true);
    } else if (oldLoading && !loading && this.get('options.length') > 0) {
      run.schedule('actions', null, select.actions.open);
    }

    if (oldDisabled && !disabled) {
      this.set('resetButtonDestroyed', false);
    }

    this.setProperties({
      _oldSelect: select,
      _lastSearchedText: lastSearchedText,
      _loading: loading,
      _lastDisabled: disabled
    });
  },

  // Actions
  actions: {
    stopPropagation(e) {
      e.stopPropagation();
    },

    clear(e) {
      e.stopPropagation();
      this.set('text', '');
      if (this.get('onClear')) {
        this.get('onClear')();
      } else {
        this.get('select').actions.select(null);
        this.get('onInput')({ target: { value: '' } });
      }
      this.get('onFocus')(e);
      this.$('input').focus();
    },

    handleKeydown(e) {
      let isLetter = e.keyCode >= 48 && e.keyCode <= 90 || e.keyCode === 32; // Keys 0-9, a-z or SPACE
      let isSpecialKeyWhileClosed = !isLetter && !this.get('select.isOpen') && [13, 27, 38, 40].indexOf(e.keyCode) > -1;
      if (isLetter || isSpecialKeyWhileClosed) {
        e.stopPropagation();
      }
    },

    handleInputLocal(e) {
      // If something is already selected when the user types, it should clear selection
      if (this.get('select.selected')) {
        this.get('select').actions.select(null);
      }
      this.get('onInput')(e.target ? e : { target: { value: e } });
      this.set('text', e.target ? e.target.value : e);
    },

    resetButtonDestroyed() {
      if (this.get('disabled')) {
        this.set('resetButtonDestroyed', true);
      }
    }
  },
  // Methods
  getSelectedAsText() {
    let labelPath = this.get('extra.labelPath');
    if (labelPath) {
      return this.get(`select.selected.${labelPath}`);
    } else {
      return this.get('select.selected');
    }
  }
});
