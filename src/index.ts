import * as _ from 'lodash'

export class DecodeError extends Error {
   plain_message: string
   inner_error: DecodeError

   constructor(message: string, inner_error: DecodeError = null) {
      super()
      this.message = 'Decode Failure: ' + message
      this.plain_message = message
      this.inner_error = inner_error
      Object.setPrototypeOf(this, DecodeError.prototype)
   }
}

function actualValueDescription(obj: any): string {
   if (_.isNull(obj)) {
      return 'null'
   }

   if (_.isUndefined(obj)) {
      return 'undefined'
   }

   if (_.isString(obj)) {
      return `[${obj}]`
   }

   if (_.isNumber(obj)) {
      return `[${obj}]`
   }

   if (_.isPlainObject(obj)) {
      return `an object with the properties [${Object.keys(obj).join(', ')}]`
   }

   return typeof obj
}

export function fail(message: string) {
   return new DecodeError(message)
}

export interface Decoder<T> {
   (obj: any): T
   expectation: string
}

export function hardcoded<T>(value: T): Decoder<T> {
   return Object.assign(
      () => {
         return value
      },
      { expectation: null }
   )
}

export function optional<T>(path: string, decoder: Decoder<T>): Decoder<T | null> {
   const expectation = `${decoder.expectation} optionally at [${path}]`
   return Object.assign(
      (obj: any) => {
         if (!_.has(obj, path)) {
            return null
         }

         const value = obj[path]

         if (_.isUndefined(value)) {
            return null
         }

         return nullable(decoder)(value)
      },
      { expectation: expectation }
   )
}

export function nullable<T>(decoder: Decoder<T>): Decoder<T | null> {
   const expectation = `be null or ${decoder.expectation}`
   return Object.assign(
      (obj: any) => {
         if (_.isNull(obj)) {
            return null
         }

         try {
            return decoder(obj)
         } catch (e) {
            throw new DecodeError(`Expected the value to ${expectation} but got ${actualValueDescription(obj)}. ${e.plain_message || ''}`, e)
         }
      },
      { expectation: expectation }
   )
}

export function required<T>(path: string, decoder: Decoder<T>): Decoder<T> {
   const expectation = `${decoder.expectation} at [${path}]`
   return Object.assign(
      (obj: any) => {
         if (!_.has(obj, path)) {
            throw new DecodeError(`Expected the value at [${path}] to ${decoder.expectation} but there was none.`)
         }

         try {
            return decoder(obj[path])
         } catch (e) {
            throw new DecodeError(`Expected the value at [${path}] to ${decoder.expectation}. ${e.plain_message || ''}`, e)
         }
      },
      { expectation: expectation }
   )
}

export function withDefault<T>(default_value: T, decoder: Decoder<T | null>): Decoder<T> {
   return Object.assign(
      (obj: any) => {
         return _.defaultTo(decoder(obj), default_value)
      },
      { expectation: decoder.expectation }
   )
}

export const str: Decoder<string> = (function() {
   const expectation = 'be a string'
   return Object.assign(
      (obj: any) => {
         if (!_.isString(obj)) {
            throw new DecodeError(`Expected to ${expectation} but got ${actualValueDescription(obj)}.`)
         }

         return obj
      },
      { expectation: expectation }
   )
})()

export const date: Decoder<Date> = (function() {
   const expectation = 'be a date'
   return Object.assign(
      (obj: any) => {
         if (!_.isDate(obj)) {
            throw new DecodeError(`Expected to ${expectation} but got ${actualValueDescription(obj)}.`)
         }

         return obj
      },
      { expectation: expectation }
   )
})()

export const bool: Decoder<boolean> = (function() {
   const expectation = 'be a boolean'
   return Object.assign(
      (obj: any) => {
         if (!_.isBoolean(obj)) {
            throw new DecodeError(`Expected to ${expectation} but got ${actualValueDescription(obj)}.`)
         }

         return obj
      },
      { expectation: expectation }
   )
})()

export const number: Decoder<number> = (function() {
   const expectation = 'be a number'
   return Object.assign(
      (obj: any) => {
         if (!_.isNumber(obj)) {
            throw new DecodeError(`Expected to ${expectation} but got ${actualValueDescription(obj)}.`)
         }

         return obj
      },
      { expectation: expectation }
   )
})()

export const anyObject: Decoder<Object> = (function() {
   const expectation = 'be an object'
   return Object.assign(
      (obj: any) => {
         if (!_.isObject(obj)) {
            throw new DecodeError(`Expected to ${expectation} but got ${actualValueDescription(obj)}.`)
         }

         return obj
      },
      { expectation: expectation }
   )
})()

export function array<T>(decoder: Decoder<T>): Decoder<T[]> {
   const expectation = `be an array where each element should ${decoder.expectation}`
   return Object.assign(
      (obj: any) => {
         if (!_.isArray(obj)) {
            throw new DecodeError(`Expected to ${expectation} but got ${actualValueDescription(obj)}.`)
         }

         return _.map(obj, decoder)
      },
      { expectation: expectation }
   )
}

export function dictionary<T>(decoder: Decoder<T>): Decoder<_.Dictionary<T>> {
   const expectation = `be a dictionary object where each value should ${decoder.expectation}`
   return Object.assign(
      (obj: any) => {
         if (!_.isPlainObject(obj)) {
            throw new DecodeError(`Expected the value to ${expectation} but got ${actualValueDescription(obj)}.`)
         }

         let prop_name: string
         try {
            const result: _.Dictionary<T> = {}
            for (prop_name of Object.keys(obj)) {
               result[prop_name] = decoder(obj[prop_name])
            }

            return result
         } catch (e) {
            throw new DecodeError(`Expected the value with the key [${prop_name}] to ${decoder.expectation}. ${e.plain_message || ''}`)
         }
      },
      { expectation: expectation }
   )
}

type ObjectDecoder<T> = { [P in keyof Required<T>]: Decoder<T[P]> }

export function object<T extends Object>(props: ObjectDecoder<T>): Decoder<T> {
   const expectation = `be an object with the properties [${Object.keys(props).join(', ')}]`
   return Object.assign(
      (obj: any) => {
         let prop_name: string
         try {
            const result: any = {}
            for (prop_name of Object.keys(props)) {
               const decoder = props[prop_name]
               result[prop_name] = decoder(obj)
            }

            return result
         } catch (e) {
            const inner_error = _.isNil(e.inner_error) ? e.plain_message : e.inner_error.plain_message
            throw new DecodeError(`Expected the value to ${props[prop_name].expectation}. ${inner_error}`)
         }
      },
      { expectation: expectation }
   )
}

export function enumeration<T>(coerce: (val: string) => T, options: string[]): Decoder<T> {
   const expectation = `to be one of [${options.join(', ')}]`
   return Object.assign(
      (obj: any) => {
         if (!_.isString(obj)) {
            throw new DecodeError(expectation + ` but got [${obj}]`)
         }

         if (!_.includes(options, obj)) {
            throw new DecodeError(expectation + ` but got [${obj}]`)
         }

         return coerce(obj)
      },
      { expectation: expectation }
   )
}

export function custom<T>(decoder: (val: any) => T, expectation: string): Decoder<T> {
   return Object.assign(
      (obj: any) => {
         return decoder(obj)
      },
      { expectation: expectation }
   )
}

export function dependent<T1, T2>(decoder: Decoder<T1>, dependentDecoder: (val: T1) => Decoder<T2>): Decoder<T2> {
   return Object.assign(
      (obj: any) => {
         return dependentDecoder(decoder(obj))(obj)
      },
      { expectation: dependentDecoder(null).expectation }
   )
}

export const withoutValidation: Decoder<any> = (function() {
   return Object.assign(
      (obj: any) => {
         return obj
      },
      { expectation: 'be any value' }
   )
})()
