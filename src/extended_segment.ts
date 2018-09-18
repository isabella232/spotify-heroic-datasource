import _ from 'lodash';
import $ from 'jquery';
import angular from 'angular';
// import metricSegment from 'public/app/core/directives/metric_segment';

/** @ngInject */
export function metricSegmentExtended($compile, $sce) {
  const inputTemplate =
    '<input type="text" data-provide="typeahead" ' +
    ' class="gf-form-input input-medium"' +
    ' spellcheck="false" style="display:none"></input>';

  const linkTemplate =
    '<a class="gf-form-label" ng-class="segment.cssClass" ' +
    'tabindex="1" give-focus="segment.focus" ng-bind-html="segment.html"></a>';

  const selectTemplate =
    '<a class="gf-form-input gf-form-input--dropdown" ng-class="segment.cssClass" ' +
    'tabindex="1" give-focus="segment.focus" ng-bind-html="segment.html"></a>';

  return {
    scope: {
      segment: '=',
      getOptions: '&',
      onChange: '&',
      debounce: '@',
    },
    link: ($scope, elem) => {
      const $input = $(inputTemplate);
      const segment = $scope.segment;
      const $button = $(segment.selectMode ? selectTemplate : linkTemplate);
      let options = null;
      let cancelBlur = null;
      let linkMode = true;
      const debounceLookup = $scope.debounce;

      $input.appendTo(elem);
      $button.appendTo(elem);

      $scope.updateVariableValue = value => {
        if (value === '' || segment.value === value) {
          return;
        }

        value = _.unescape(value);

        $scope.$apply(() => {
          const selected = _.find($scope.altSegments, { value: value });
          if (selected) {
            segment.value = selected.value;
            segment.html = selected.html || selected.value;
            segment.fake = false;
            segment.expandable = selected.expandable;

            if (selected.type) {
              segment.type = selected.type;
            }
          } else if (segment.custom !== 'false') {
            segment.value = value;
            segment.html = $sce.trustAsHtml(value);
            segment.expandable = true;
            segment.fake = false;
          }

          $scope.onChange();
        });
      };

      $scope.switchToLink = fromClick => {
        if (linkMode && !fromClick) {
          return;
        }

        clearTimeout(cancelBlur);
        cancelBlur = null;
        linkMode = true;
        $input.hide();
        $button.show();
        $scope.updateVariableValue($input.val());
      };

      $scope.inputBlur = () => {
        // happens long before the click event on the typeahead options
        // need to have long delay because the blur
        cancelBlur = setTimeout($scope.switchToLink, 200);
      };

      $scope.source = (query, callback) => {
        $scope.$apply(() => {
          $scope.getOptions({ $query: query }).then(altSegments => {
            $scope.altSegments = altSegments;
            options = _.map($scope.altSegments, alt => {
              return _.escape(alt.value);
            });

            // add custom values
            if (segment.custom !== 'false') {
              if (!segment.fake && _.indexOf(options, segment.value) === -1) {
                options.unshift(segment.value);
              }
            }

            callback(options);
          });
        });
      };

      $scope.updater = value => {
        if (value === segment.value) {
          clearTimeout(cancelBlur);
          $input.focus();
          return value;
        }

        $input.val(value);
        $scope.switchToLink(true);

        return value;
      };

      $scope.matcher = function(item) {
        let str = this.query;
        if (str[0] === '/') {
          str = str.substring(1);
        }
        if (str[str.length - 1] === '/') {
          str = str.substring(0, str.length - 1);
        }
        try {
          return item.toLowerCase().match(str.toLowerCase());
        } catch (e) {
          return false;
        }
      };

      $input.attr('data-provide', 'typeahead');
      $input.typeahead({
        source: $scope.source,
        minLength: 0,
        items: 10000,
        updater: $scope.updater,
        matcher: $scope.matcher,
      });

      const typeahead = $input.data('typeahead');
      typeahead.lookup = function() {
        this.query = this.$element.val() || '';
        const items = this.source(this.query, $.proxy(this.process, this));
        return items ? this.process(items) : items;
      };

      if (debounceLookup) {
        typeahead.lookup = _.debounce(typeahead.lookup, 500, { leading: true });
      }

      $button.keydown(evt => {
        // trigger typeahead on down arrow or enter key
        if (evt.keyCode === 40 || evt.keyCode === 13) {
          $button.click();
        }
      });

      $button.click(() => {
        options = null;
        $input.css('width', Math.max($button.width(), 80) + 16 + 'px');

        $button.hide();
        $input.show();
        $input.focus();

        linkMode = false;

        const typeahead = $input.data('typeahead');
        if (typeahead) {
          $input.val('');
          typeahead.lookup();
        }
      });

      $input.blur($scope.inputBlur);

      $compile(elem.contents())($scope);
    },
  };
}

/** @ngInject */
export function metricSegmentModelExtended(uiSegmentSrv, $q) {
  return {
    template:
      '<metric-segment segment="segment" get-options="getOptionsInternal()" on-change="onSegmentChange()"></metric-segment>',
    restrict: 'E',
    scope: {
      property: '=',
      options: '=',
      getOptions: '&',
      onChange: '&',
    },
    link: {
      pre: function postLink($scope, elem, attrs) {
        let cachedOptions;

        $scope.valueToSegment = value => {
          const option = _.find($scope.options, { value: value });
          const segment = {
            cssClass: attrs.cssClass,
            custom: attrs.custom,
            value: option ? option.text : value,
            selectMode: attrs.selectMode,
          };

          return uiSegmentSrv.newSegment(segment);
        };

        $scope.getOptionsInternal = () => {
          if ($scope.options) {
            cachedOptions = $scope.options;
            return $q.when(
              _.map($scope.options, option => {
                return { value: option.text };
              })
            );
          } else {
            return $scope.getOptions().then(options => {
              cachedOptions = options;
              return _.map(options, option => {
                if (option.html) {
                  return option;
                }
                return { value: option.text };
              });
            });
          }
        };

        $scope.onSegmentChange = () => {
          if (cachedOptions) {
            const option = _.find(cachedOptions, { text: $scope.segment.value });
            if (option && option.value !== $scope.property) {
              $scope.property = option.value;
            } else if (attrs.custom !== 'false') {
              $scope.property = $scope.segment.value;
            }
          } else {
            $scope.property = $scope.segment.value;
          }

          // needs to call this after digest so
          // property is synced with outerscope
          $scope.$$postDigest(() => {
            $scope.$apply(() => {
              $scope.onChange();
            });
          });
        };

        $scope.segment = $scope.valueToSegment($scope.property);
      },
    },
  };
}

angular.module('grafana.directives').directive('metricSegmentExtended', metricSegmentExtended);
angular.module('grafana.directives').directive('metricSegmentModelExtended', metricSegmentModelExtended);
