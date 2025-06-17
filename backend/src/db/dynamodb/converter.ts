import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";

export const convertToDdbMap = (obj: any): Record<string, AttributeValue> => {
  const deepcopy = JSON.parse(JSON.stringify(obj));
  return marshall(deepcopy);
};

export const convertFromDdbMap = (obj: any): Record<string, any> => {
  return unmarshall(obj);
};
