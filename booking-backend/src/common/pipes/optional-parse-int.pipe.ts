import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from "@nestjs/common";

/**
 * OptionalParseIntPipe - A pipe that parses a string to an integer,
 * but returns undefined for missing or empty values (allowing parameter defaults to apply).
 *
 * Unlike the built-in ParseIntPipe, this pipe does not throw an error
 * when the value is undefined or an empty string - it returns undefined instead.
 * This allows @Query() parameters with default values to work correctly
 * when the query parameter is not provided in the request.
 *
 * Usage:
 *   @Query('page', OptionalParseIntPipe) page: number = 1
 *
 * Behavior:
 *   - undefined or '' → returns undefined (lets default value apply)
 *   - '123' → returns 123
 *   - 'abc' → throws BadRequestException
 */
@Injectable()
export class OptionalParseIntPipe implements PipeTransform<
  string | undefined,
  number | undefined
> {
  transform(
    value: string | undefined,
    _metadata: ArgumentMetadata,
  ): number | undefined {
    // If value is undefined or empty string, return undefined
    // This allows the parameter's default value to be used
    if (value === undefined || value === "") {
      return undefined;
    }

    const val = parseInt(value, 10);

    if (isNaN(val)) {
      throw new BadRequestException(
        `Validation failed: "${value}" is not a valid integer`,
      );
    }

    return val;
  }
}
